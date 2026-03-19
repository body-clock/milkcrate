class PrepNextFeaturedStoreJob < ApplicationJob
  queue_as :default

  MAX_ATTEMPTS = 3

  def perform(attempt: 1)
    tomorrow = Date.current + 1
    store = Store.featured_on(tomorrow)
    return unless store

    if store.stale?
      Rails.logger.info "[PrepNextFeaturedStore] Syncing #{store.discogs_username} for #{tomorrow} (attempt #{attempt})"
      FullStoreSyncJob.perform_later(store.id)
    else
      Rails.logger.info "[PrepNextFeaturedStore] #{store.discogs_username} is fresh, skipping sync"
    end
  rescue => e
    Rails.logger.error "[PrepNextFeaturedStore] Attempt #{attempt} failed: #{e.message}"
    retry_in = attempt * 30.minutes
    self.class.set(wait: retry_in).perform_later(attempt: attempt + 1) if attempt < MAX_ATTEMPTS
  end
end
