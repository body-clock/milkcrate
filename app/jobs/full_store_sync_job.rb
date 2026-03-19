class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    count = StoreSyncService.new(store).full_sync(max_pages: max_pages)
    Rails.logger.info("FullStoreSync: imported #{count} listings for #{store.discogs_username}")

    EnrichListingsJob.perform_later(store_id)
  end
end
