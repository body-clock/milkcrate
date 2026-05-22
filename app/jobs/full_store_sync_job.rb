class FullStoreSyncJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)

    # Route OAuth-authorized stores to CSV export sync
    if store.oauth_authorized?
      CsvExportSyncJob.perform_later(store_id)
      return
    end

    service = StoreSyncService.new(store)
    result = service.sync(max_pages: max_pages)

    Rails.logger.info("FullStoreSync: synced #{store.listings.count} listings for #{store.discogs_username}")

    EnrichmentJob.perform_later(store_id, listing_ids: result.listing_ids_for_enrichment) if result.listing_ids_for_enrichment.any?
    DailyCurationJob.perform_later(store_id)
  rescue StandardError => error
    Rails.logger.error(
      "[FullStoreSyncJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    StoreSync::StatusManager.new(store).mark_failed!(error) if store
    raise
  end
end
