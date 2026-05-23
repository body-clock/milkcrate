class EnrichmentService
  BATCH_SIZE = 50
  MUSICBRAINZ_SLEEP = 1.1  # MusicBrainz has its own rate limits

  def initialize(discogs: DiscogsClient.new, musicbrainz: MusicBrainzClient.new)
    @discogs = discogs
    @musicbrainz = musicbrainz
  end

  def enrich_store(store, listing_ids: nil)
    enrichment_manager(store).mark_started!
    enrich_releases(store, listing_ids:)
    enrich_music_brainz_images(store)
    enrichment_manager(store).mark_succeeded!
  rescue StandardError
    enrichment_manager(store).mark_failed!
    raise
  end

  # ── Discogs Release Enrichment ──────────────────────────────────────────

  def enrich_releases(store, listing_ids: nil)
    scope = store.listings.where.not(discogs_release_id: nil)
    scope = scope.where(id: listing_ids) if listing_ids&.any?

    release_ids = scope.pluck(:discogs_release_id).uniq

    stale_release_ids = release_ids.reject do |rid|
      Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
    end

    # Also re-enrich releases whose listings were downgraded to thumbnails.
    downgraded_release_ids = store.listings
      .where(discogs_release_id: release_ids)
      .where("cover_image_url = thumbnail_url AND cover_image_url IS NOT NULL AND thumbnail_url IS NOT NULL")
      .distinct
      .pluck(:discogs_release_id)

    # Also re-enrich releases whose listings have sync-format data (no "Vinyl"
    # prefix) despite having a Release record. Their enriched data was
    # overwritten by prior syncs. After U1, subsequent syncs won't overwrite.
    overwritten_release_ids = store.listings
      .where.not(discogs_release_id: release_ids)
      .where("format NOT LIKE ? AND format LIKE ?", "Vinyl%", "%LP%")
      .where(discogs_release_id: Release.select(:discogs_release_id))
      .distinct
      .pluck(:discogs_release_id)

    enrich_ids = (stale_release_ids + downgraded_release_ids + overwritten_release_ids).uniq

    Rails.logger.info "[EnrichmentService] #{enrich_ids.size} releases to enrich for store #{store.name} (stale: #{stale_release_ids.size}, downgraded: #{downgraded_release_ids.size}, overwritten: #{overwritten_release_ids.size})"

    enrich_ids.each_slice(BATCH_SIZE) do |batch|
      batch.each do |release_id|
        enrich_release(release_id, store)
      rescue DiscogsClient::ApiError => e
        Rails.logger.warn "[EnrichmentService] API error for release #{release_id}: #{e.message}"
      end
    end
  end

  # ── MusicBrainz Cover Image Enrichment ──────────────────────────────────

  def enrich_music_brainz_images(store)
    candidate_release_ids = store.listings
      .joins("INNER JOIN releases ON releases.discogs_release_id = listings.discogs_release_id")
      .where(releases: { discogs_image_missing: true, musicbrainz_id: nil })
      .distinct
      .pluck("listings.discogs_release_id")

    Rails.logger.info "[EnrichmentService] #{candidate_release_ids.size} releases to search for store #{store.name}"

    candidate_release_ids.each do |discogs_release_id|
      listing = store.listings.find_by(discogs_release_id: discogs_release_id)
      next unless listing

      mbid = @musicbrainz.search_release(artist: listing.artist, title: listing.title)

      if mbid.nil?
        Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: "")
        sleep(MUSICBRAINZ_SLEEP)
        next
      end

      cover_url = @musicbrainz.front_cover_url(mbid)

      Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: mbid)

      if cover_url.present?
        store.listings
          .where(discogs_release_id: discogs_release_id)
          .update_all(cover_image_url: cover_url)
      end

      sleep(MUSICBRAINZ_SLEEP)
    rescue MusicBrainzClient::ApiError => e
      Rails.logger.warn "[EnrichmentService] API error for #{discogs_release_id}: #{e.message}"
    end
  end

  private

  def enrich_release(discogs_release_id, store)
    data, = @discogs.release(discogs_release_id)

    want    = data.dig("community", "want").to_i
    have    = data.dig("community", "have").to_i
    genres  = Array(data["genres"])
    styles  = Array(data["styles"])
    formats = Array(data["formats"])
    format_str  = formats.flat_map { |f| [ f["name"], *Array(f["descriptions"]) ] }.join(", ").presence
    cover_url   = extract_primary_image(data)
    tracklist   = extract_tracklist(data)

    now = Time.current
    Release.upsert(
      { discogs_release_id: discogs_release_id, want_count: want, have_count: have,
        enriched_at: now, discogs_image_missing: cover_url.nil?, created_at: now, updated_at: now },
      unique_by: :discogs_release_id,
      update_only: %i[want_count have_count enriched_at discogs_image_missing]
    )

    listing_updates = { want_count: want, have_count: have }
    listing_updates[:genres]          = genres     if genres.any?
    listing_updates[:styles]          = styles     if styles.any?
    listing_updates[:format]          = format_str if format_str
    listing_updates[:cover_image_url] = cover_url  if cover_url.present?
    listing_updates[:tracklist]       = tracklist  if tracklist.any?

    store.listings
      .where(discogs_release_id: discogs_release_id)
      .update_all(listing_updates)
  end

  def extract_primary_image(data)
    images = data["images"] || []
    primary = images.find { |img| img["type"] == "primary" } || images.first
    primary&.dig("uri")
  end

  def extract_tracklist(data)
    (data["tracklist"] || []).map do |track|
      { "position" => track["position"], "title" => track["title"] }
    end
  end

  def enrichment_manager(store)
    @enrichment_managers ||= {}
    @enrichment_managers[store.id] ||= StoreEnrichment::StatusManager.new(store)
  end
end
