# Polls recent Discogs orders for a single store and removes sold listings.
# Uses per-store concurrency key to prevent duplicate polls for the same store.
class SalesPollStoreJob < ApplicationJob
  limits_concurrency to: 1, key: ->(store_id) { "sales_poll_#{store_id}" }
  queue_as :default

  def perform(store_id)
    store = Store.find(store_id)
    StoreSales::OrderPoller.new(store).call
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn("[SalesPollStoreJob] store #{store_id} not found, discarding")
  end
end
