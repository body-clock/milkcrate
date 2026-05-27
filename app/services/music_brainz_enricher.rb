# frozen_string_literal: true

# Enriches listings with additional metadata from MusicBrainz lookups.
class MusicBrainzEnricher
  SLEEP_INTERVAL = 1.1

  def initialize(musicbrainz: MusicBrainzClient.new)
    @musicbrainz = musicbrainz
  end

  def enrich_store(store)
    release_ids = candidate_release_ids(store)
    log_candidates(store, release_ids)
    release_ids.each { |discogs_release_id| enrich_listing(store, discogs_release_id) }
  end

  private

  def candidate_release_ids(store)
    store.listings
      .joins("INNER JOIN releases ON releases.discogs_release_id = listings.discogs_release_id")
      .where(releases: { discogs_image_missing: true, musicbrainz_id: nil })
      .distinct
      .pluck("listings.discogs_release_id")
  end

  def log_candidates(store, release_ids)
    Rails.logger.info "[MusicBrainzEnricher] #{release_ids.size} releases to search for store #{store.name}"
  end

  def enrich_listing(store, discogs_release_id)
    listing = store.listings.find_by(discogs_release_id: discogs_release_id)
    return unless listing

    enrich_found_listing(store, discogs_release_id, listing)
  rescue MusicBrainzClient::ApiError => e
    Rails.logger.warn "[MusicBrainzEnricher] API error for #{discogs_release_id}: #{e.message}"
  end

  def enrich_found_listing(store, discogs_release_id, listing)
    mbid = @musicbrainz.search_release(artist: listing.artist, title: listing.title)
    return record_missing_match(discogs_release_id) if mbid.nil?

    record_match(store, discogs_release_id, mbid)
    sleep(SLEEP_INTERVAL)
  end

  def record_missing_match(discogs_release_id)
    Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: "")
    sleep(SLEEP_INTERVAL)
  end

  def record_match(store, discogs_release_id, mbid)
    cover_url = @musicbrainz.front_cover_url(mbid)
    Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: mbid)
    update_cover(store, discogs_release_id, cover_url) if cover_url.present?
  end

  def update_cover(store, discogs_release_id, cover_url)
    store.listings
      .where(discogs_release_id: discogs_release_id)
      .update_all(cover_image_url: cover_url)
  end
end
