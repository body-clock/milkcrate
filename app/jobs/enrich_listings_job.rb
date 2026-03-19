class EnrichListingsJob < ApplicationJob
  queue_as :default

  # Discogs authenticated rate limit: 60 req/min = 1 req/sec
  RATE_LIMIT_SLEEP = 1.1
  RATE_LIMIT_BACKOFF = 30

  def perform(store_id)
    store = Store.find(store_id)
    client = DiscogsClient.new

    listings = store.listings
      .where.not(discogs_release_id: [ nil, "" ])
      .where("cover_image_url = thumbnail_url OR cover_image_url IS NULL OR genres = '{}'")

    enriched = 0
    listings.find_each do |listing|
      release_data = client.release(listing.discogs_release_id)
      updates = extract_updates(release_data, listing)

      if updates.any?
        listing.update_columns(updates)
        enriched += 1
      end

      sleep(RATE_LIMIT_SLEEP)
    rescue DiscogsClient::RateLimitError
      Rails.logger.warn("EnrichListings: rate limited — backing off #{RATE_LIMIT_BACKOFF}s")
      sleep(RATE_LIMIT_BACKOFF)
      retry
    rescue DiscogsClient::ApiError => e
      Rails.logger.warn("EnrichListings: skipping release #{listing.discogs_release_id} — #{e.message}")
    end

    Rails.logger.info("EnrichListings: enriched #{enriched} listings for #{store.discogs_username}")
  end

  private

  def extract_updates(release_data, listing)
    updates = {}

    image_url = extract_primary_image(release_data)
    updates[:cover_image_url] = image_url if image_url.present? && image_url != listing.cover_image_url

    genres = Array(release_data["genres"])
    updates[:genres] = genres if genres.any? && listing.genres.empty?

    styles = Array(release_data["styles"])
    updates[:styles] = styles if styles.any? && listing.styles.empty?

    tracklist = extract_tracklist(release_data)
    updates[:tracklist] = tracklist if tracklist.any? && Array(listing.tracklist).empty?

    updates
  end

  def extract_primary_image(release_data)
    images = release_data["images"] || []
    primary = images.find { |img| img["type"] == "primary" } || images.first
    primary&.dig("uri")
  end

  def extract_tracklist(release_data)
    (release_data["tracklist"] || []).map do |track|
      { "position" => track["position"], "title" => track["title"] }
    end
  end
end
