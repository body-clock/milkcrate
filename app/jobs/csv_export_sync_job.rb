class CsvExportSyncJob < ApplicationJob
  limits_concurrency to: 1, key: ->(store_id) { "csv_export:#{store_id}" }
  queue_as :default

  def perform(store_id)
    store = Store.find(store_id)
    raise "Store #{store_id} is not OAuth authorized" unless store.oauth_authorized?

    service = CsvExportSyncService.new(store)
    result = service.call

    Rails.logger.info("[CsvExportSyncJob] Synced #{store.listings.count} listings for #{store.discogs_username} (export_id=#{result.export_id})")

    if result.listing_ids_for_enrichment.any?
      EnrichmentJob.perform_later(store_id, listing_ids: result.listing_ids_for_enrichment)
    end

    DailyCurationJob.perform_later(store_id)
  rescue StandardError => error
    Rails.logger.error(
      "[CsvExportSyncJob] store=#{store&.discogs_username || store_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    raise
  end
end
