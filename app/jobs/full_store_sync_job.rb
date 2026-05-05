class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    service = StoreSyncService.new(store)

    store.update!(sync_status: "syncing")

    result = service.sync(max_pages: max_pages, manage_status: false)

    store.mark_sync_succeeded!(
      last_synced_at: Time.current,
      total_listings: store.listings.count,
      catalog_coverage: result.catalog_coverage,
      inventory_page_count: result.inventory_page_count
    )
    Rails.logger.info("FullStoreSync: synced #{store.listings.count} listings for #{store.discogs_username}")

    EnrichReleasesJob.perform_later(store_id, listing_ids: result.listing_ids_for_enrichment) if result.listing_ids_for_enrichment.any?
    DailyCurationJob.perform_later(store_id)
  rescue StandardError => error
    Rails.logger.error(
      "[FullStoreSyncJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    store&.mark_sync_failed!(error)
    raise
  end
end
