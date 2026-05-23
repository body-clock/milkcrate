# Job that performs a full inventory sync for a store from Discogs.
class FullStoreSyncJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    store.update!(sync_status: "syncing")
    sync_started_at = Time.current

    result = store.sync_strategy.call(store, max_pages: max_pages)
    updater = StoreSync::InventoryUpdater.new(store)
    listing_ids_for_enrichment = updater.call(result.listings)

    if result.complete?
      updater.remove_stale(result.listings)
    end

    sync_manager(store).mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: store.listings.count
    )

    Rails.logger.info("[FullStoreSyncJob] synced #{store.listings.count} listings for #{store.discogs_username}")

    if listing_ids_for_enrichment.any?
      EnrichmentJob.perform_later(store.id, listing_ids: listing_ids_for_enrichment)
    end
    DailyCurationJob.perform_later(store.id)
  rescue StandardError => error
    Rails.logger.error(
      "[FullStoreSyncJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    sync_manager(store).mark_failed!(error) if store
    raise
  end

  private

  def sync_manager(store)
    StoreSync::StatusManager.new(store)
  end
end
