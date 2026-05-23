# frozen_string_literal: true

class MusicBrainzEnricher
  SLEEP_INTERVAL = 1.1

  def initialize(musicbrainz: MusicBrainzClient.new)
    @musicbrainz = musicbrainz
  end

  def enrich_store(store)
    candidate_release_ids = store.listings
      .joins("INNER JOIN releases ON releases.discogs_release_id = listings.discogs_release_id")
      .where(releases: { discogs_image_missing: true, musicbrainz_id: nil })
      .distinct
      .pluck("listings.discogs_release_id")

    Rails.logger.info "[MusicBrainzEnricher] #{candidate_release_ids.size} releases to search for store #{store.name}"

    candidate_release_ids.each do |discogs_release_id|
      enrich_listing(store, discogs_release_id)
    end
  end

  private

  def enrich_listing(store, discogs_release_id)
    listing = store.listings.find_by(discogs_release_id: discogs_release_id)
    return unless listing

    mbid = @musicbrainz.search_release(artist: listing.artist, title: listing.title)

    if mbid.nil?
      Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: "")
      sleep(SLEEP_INTERVAL)
      return
    end

    cover_url = @musicbrainz.front_cover_url(mbid)

    Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: mbid)

    if cover_url.present?
      store.listings
        .where(discogs_release_id: discogs_release_id)
        .update_all(cover_image_url: cover_url)
    end

    sleep(SLEEP_INTERVAL)
  rescue MusicBrainzClient::ApiError => e
    Rails.logger.warn "[MusicBrainzEnricher] API error for #{discogs_release_id}: #{e.message}"
  end
end
