# Fetches and stores Discogs profile data for a store.
# Populates avatar_url, location, description, and genre_tags.
class StoreProfileSyncJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id)
    sync_store_profile(store_id)
  rescue StandardError => e
    handle_error(store_id, e)
  end

  private

  def handle_error(store_id, error)
    log_failure(store_id, error)
    raise unless api_error?(error)
  end

  def api_error?(error)
    error.is_a?(Discogs::Errors::ApiError) ||
      error.is_a?(Discogs::Errors::RateLimitError) ||
      error.is_a?(DiscogsClient::ApiError)
  end

  def sync_store_profile(store_id)
    @store = Store.find(store_id)
    update_store(@store, fetch_profile(@store))
  end

  def update_store(store, profile)
    store.update!(
      avatar_url: profile["avatar_url"],
      location: profile["location"],
      description: profile["profile"],
      genre_tags: StoreProfileParser.new(profile["profile"]).genre_tags
    )
  end

  def fetch_profile(store)
    client.seller_profile(store.discogs_username)
  end

  def log_failure(store_id, error)
    Rails.logger.error("[StoreProfileSyncJob] store=#{store_id} failed: #{error.message}")
  end

  def client
    @client ||= DiscogsClient.new
  end
end
