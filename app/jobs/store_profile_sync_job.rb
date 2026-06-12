# Fetches and stores Discogs profile data for a store.
# Populates avatar_url, location, description, and genre_tags.
class StoreProfileSyncJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id)
    store = Store.find(store_id)
    profile = fetch_profile(store)

    store.update!(
      avatar_url: profile["avatar_url"],
      location: profile["location"],
      description: profile["profile"],
      genre_tags: StoreProfileParser.new(profile["profile"]).genre_tags
    )
  rescue Discogs::Errors::ApiError, Discogs::Errors::RateLimitError, DiscogsClient::ApiError => e
    Rails.logger.warn("[StoreProfileSyncJob] store=#{store&.discogs_username} failed: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("[StoreProfileSyncJob] store=#{store_id} failed: #{e.message}")
    raise
  end

  private

  def fetch_profile(store)
    client.seller_profile(store.discogs_username)
  end

  def client
    @client ||= DiscogsClient.new
  end
end
