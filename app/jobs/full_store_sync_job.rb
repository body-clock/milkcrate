class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    service = StoreSyncService.new(store)

    count_desc = service.full_sync(max_pages: max_pages, sort_order: "desc")
    count_asc  = service.full_sync(max_pages: max_pages, sort_order: "asc")

    Rails.logger.info("FullStoreSync: imported #{count_desc + count_asc} listings for #{store.discogs_username}")

    EnrichReleasesJob.perform_later(store_id)
    DailyCurationJob.perform_later(store_id)
  end
end
