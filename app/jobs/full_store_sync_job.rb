class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    service = StoreSyncService.new(store)

    store.update!(sync_status: "syncing")

    count_desc = service.full_sync(max_pages: max_pages, sort_order: "desc", manage_status: false)
    count_asc  = service.full_sync(max_pages: max_pages, sort_order: "asc", manage_status: false)

    store.update!(sync_status: "idle", last_synced_at: Time.current, total_listings: store.listings.count)
    Rails.logger.info("FullStoreSync: imported #{count_desc + count_asc} listings for #{store.discogs_username}")

    EnrichReleasesJob.perform_later(store_id)
    DailyCurationJob.perform_later(store_id)
  rescue StandardError => e
    store.update!(sync_status: "failed")
    raise
  end
end
