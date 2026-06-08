# Polls recent Discogs orders for a single store and removes sold listings.
# Uses per-store concurrency key to prevent duplicate polls for the same store.
class SalesPollStoreJob < ApplicationJob
  limits_concurrency to: 1, key: ->(store_id) { "sales_poll_#{store_id}" }
  queue_as :default

  def perform(store_id)
    poll_store(Store.find(store_id))
  rescue ActiveRecord::RecordNotFound
    log_missing_store(store_id)
  rescue Discogs::Errors::TransientApiError => error
    log_transient_failure(store_id, error)
  end

  private

  def poll_store(store)
    result = StoreSales::OrderPoller.new(store).call
    enqueue_curation_if_needed(store, result)
  end

  def log_missing_store(store_id)
    Rails.logger.warn("[SalesPollStoreJob] store #{store_id} not found, discarding")
  end

  def log_transient_failure(store_id, error)
    Rails.logger.warn(
      "[SalesPollStoreJob] transient Discogs failure for store #{store_id}: #{error.message}"
    )
  end

  def enqueue_curation_if_needed(store, result)
    return unless result && result[:removed_count] > 0

    DailyCurationJob.perform_later(store.id)
  end
end
