class EnrichMusicBrainzImagesJob < ApplicationJob
  queue_as :default

  RATE_LIMIT_SLEEP = 1.0

  def perform(store_id)
    store  = Store.find(store_id)
    client = MusicBrainzClient.new

    candidate_release_ids = store.listings
      .joins("INNER JOIN releases ON releases.discogs_release_id = listings.discogs_release_id")
      .where(releases: { discogs_image_missing: true, musicbrainz_id: nil })
      .distinct
      .pluck("listings.discogs_release_id")

    Rails.logger.info "[EnrichMusicBrainzImagesJob] #{candidate_release_ids.size} releases to search for store #{store.name}"

    candidate_release_ids.each do |discogs_release_id|
      listing = store.listings.find_by(discogs_release_id: discogs_release_id)
      next unless listing

      mbid = client.search_release(artist: listing.artist, title: listing.title)

      if mbid.nil?
        Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: "")
        sleep(RATE_LIMIT_SLEEP)
        next
      end

      cover_url = client.front_cover_url(mbid)

      Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: mbid)

      if cover_url.present?
        store.listings
          .where(discogs_release_id: discogs_release_id)
          .update_all(cover_image_url: cover_url)
      end

      sleep(RATE_LIMIT_SLEEP)
    rescue MusicBrainzClient::ApiError => e
      Rails.logger.warn "[EnrichMusicBrainzImagesJob] API error for #{discogs_release_id}: #{e.message}"
    end
  end
end
