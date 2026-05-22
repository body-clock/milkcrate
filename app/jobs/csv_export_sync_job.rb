class CsvExportSyncJob < ApplicationJob
  # TODO: Replace with full CSV export implementation in U6.
  # For now, this stub allows the OAuth callback to enqueue without error.
  limits_concurrency to: 1, key: ->(store_id) { "csv_export:#{store_id}" }
  queue_as :default

  def perform(store_id)
    store = Store.find(store_id)
    Rails.logger.info("[CsvExportSyncJob] CSV export sync triggered for #{store.discogs_username} (store=#{store_id})")
    # Actual implementation: trigger Discogs CSV export, poll, download, parse, reconcile
  rescue StandardError => error
    Rails.logger.error("[CsvExportSyncJob] store=#{store_id} failed: #{error.message}")
    raise
  end
end
