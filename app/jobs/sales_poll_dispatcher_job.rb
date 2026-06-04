# Dispatches sales polling jobs for OAuth-authorized stores that are due for polling.
# Selects stores where last_sales_polled_at is nil or older than POLL_INTERVAL,
# respects a per-run budget, and staggers enqueued jobs to avoid rate limit spikes.
class SalesPollDispatcherJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  MAX_STORES_PER_RUN = 20
  STAGGER_INTERVAL = 3.seconds
  POLL_INTERVAL = 1.minute

  def perform
    due_stores.each_with_index do |store, index|
      SalesPollStoreJob
        .set(wait: STAGGER_INTERVAL * index)
        .perform_later(store.id)
    end
  end

  private

  def due_stores
    Store.joins(:store_owner)
      .where.not(store_owners: { discogs_oauth_token: nil, discogs_oauth_token_secret: nil })
      .where("last_sales_polled_at IS NULL OR last_sales_polled_at < ?", POLL_INTERVAL.ago)
      .limit(MAX_STORES_PER_RUN)
  end
end
