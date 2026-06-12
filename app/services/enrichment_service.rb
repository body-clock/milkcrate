# Enriches listing metadata (genres, styles, images) from MusicBrainz and Discogs APIs.
class EnrichmentService
  include ListingDataTransforms
  BATCH_SIZE = 50
  RATE_LIMIT_MAX_RETRIES = 3
  RATE_LIMIT_BASE_DELAY = 5

  def initialize(discogs: DiscogsClient.new, musicbrainz: MusicBrainzClient.new, progress: nil)
    @discogs = discogs
    @musicbrainz = musicbrainz
    @progress = progress
  end

  def enrich_store(store, listing_ids: nil)
    perform_enrichment(store, listing_ids:)
  rescue StandardError
    enrichment_manager(store).mark_failed!
    raise
  end

  # ── Discogs Release Enrichment ──────────────────────────────────────────

  def enrich_releases(store, listing_ids: nil)
    targets = enrichment_targets(store, listing_ids:)
    log_enrichment(store, targets)
    @progress&.total = targets[:all].size
    targets[:all].each_slice(BATCH_SIZE) { |batch| enrich_batch(batch, store) }
  end

  private

  def perform_enrichment(store, listing_ids:)
    enrichment_manager(store).mark_started!
    enrich_releases(store, listing_ids:)
    MusicBrainzEnricher.new(musicbrainz: @musicbrainz).enrich_store(store)
    enrichment_manager(store).mark_succeeded!
  end

  def enrichment_targets(store, listing_ids:)
    release_ids = release_ids_for(store, listing_ids)
    stale = stale_release_ids(release_ids)
    downgraded = downgraded_release_ids(store, release_ids)
    overwritten = overwritten_release_ids(store)
    { all: (stale + downgraded + overwritten).uniq, stale:, downgraded:, overwritten: }
  end

  def release_ids_for(store, listing_ids)
    scope = store.listings.where.not(discogs_release_id: nil)
    scope = scope.where(id: listing_ids) if listing_ids&.any?
    scope.pluck(:discogs_release_id).uniq
  end

  def stale_release_ids(release_ids) = release_ids.reject { |id| Release.find_by(discogs_release_id: id)&.then { |release| !release.stale? } }

  # Also re-enrich releases whose listings were downgraded to thumbnails.
  def downgraded_release_ids(store, release_ids)
    store.listings
      .where(discogs_release_id: release_ids)
      .where("cover_image_url = thumbnail_url AND cover_image_url IS NOT NULL AND thumbnail_url IS NOT NULL")
      .distinct
      .pluck(:discogs_release_id)
  end

  # Re-enrich listings with sync-format data despite an existing Release record.
  def overwritten_release_ids(store)
    store.listings
      .where("format NOT LIKE ? AND format LIKE ?", "Vinyl%", "%LP%")
      .where(discogs_release_id: Release.select(:discogs_release_id))
      .distinct
      .pluck(:discogs_release_id)
  end

  def log_enrichment(store, targets)
    Rails.logger.info "[EnrichmentService] #{targets[:all].size} releases to enrich for store #{store.name} (stale: #{targets[:stale].size}, downgraded: #{targets[:downgraded].size}, overwritten: #{targets[:overwritten].size})"
  end

  def enrich_batch(batch, store) = batch.each { |release_id| enrich_release_safely(release_id, store) }

  def enrich_release_safely(release_id, store)
    with_rate_limit_retries { enrich_release(release_id, store) }
    @progress&.increment
  rescue DiscogsClient::ApiError => e
    Rails.logger.warn "[EnrichmentService] API error for release #{release_id}: #{e.message}"
  end

  def with_rate_limit_retries(retries = 0, &block)
    block.call
  rescue Discogs::Errors::RateLimitError
    raise if retries >= RATE_LIMIT_MAX_RETRIES

    sleep(RATE_LIMIT_BASE_DELAY * (retries + 1))
    retry
  end

  def enrich_release(discogs_release_id, store)
    data, = @discogs.release(discogs_release_id)
    upsert_release(discogs_release_id, data)
    update_listings(store, discogs_release_id, data)
  end

  def upsert_release(discogs_release_id, data)
    now = Time.current
    Release.upsert(
      { discogs_release_id: discogs_release_id, want_count: data.dig("community", "want").to_i,
        have_count: data.dig("community", "have").to_i,
        enriched_at: now, discogs_image_missing: extract_primary_image(data).nil?,
        created_at: now, updated_at: now },
      unique_by: :discogs_release_id,
      update_only: %i[want_count have_count enriched_at discogs_image_missing]
    )
  end

  def update_listings(store, discogs_release_id, data)
    store.listings
      .where(discogs_release_id: discogs_release_id)
      .update_all(listing_updates(data))
  end

  def enrichment_manager(store) = @enrichment_manager ||= StoreEnrichment::StatusManager.new(store)
end
