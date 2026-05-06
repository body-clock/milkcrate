class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    service = StoreSyncService.new(store)
    sync_started_at = Time.current

    result = service.sync(max_pages: max_pages)

    # Service already set sync_status to idle and recorded last_synced_at.
    # Add the job-specific extras that the service doesn't own.
    store.update!(
      last_synced_at: sync_started_at,
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
