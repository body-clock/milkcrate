# frozen_string_literal: true

# Scrapes the Discogs seller profile for location data and persists it.
# Runs through DiscogsClient to inherit rate limiting and retry.
class ScrapeStoreLocationJob < ApplicationJob
  queue_as :default
  limits_concurrency to: 1, key: -> { "discogs_api" }

  def perform(store_id)
    store = Store.find(store_id)
    location = fetch_location(store)
    store.update_column(:location, location) if location
  rescue DiscogsClient::RateLimitError, DiscogsClient::ApiError, Faraday::Error => e
    Rails.logger.warn("[ScrapeStoreLocationJob] Failed for store #{store_id}: #{e.message}")
  end

  private

  def fetch_location(store)
    return if store.discogs_username.blank?

    profile = DiscogsClient.new.seller_profile(store.discogs_username)
    profile["location"].presence
  end
end
