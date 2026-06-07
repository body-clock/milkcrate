# Job that performs a full inventory sync for a store from Discogs.
class FullStoreSyncJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, max_pages: nil)
    sync_store(store_id, max_pages:)
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn("[FullStoreSyncJob] store=#{store_id} not found, skipping")
  rescue StandardError => error
    mark_failed(store_id, error)
    log_failure(store_id, error)
    raise
  end

  private

  def sync_store(store_id, max_pages:)
    store = Store.find(store_id)
    sync_started_at = Time.current.tap { store.update!(sync_status: "syncing", sync_progress_pct: 0) }
    listing_ids = run_sync(store, max_pages:)
    finalize_sync(store, sync_started_at)
    dispatch_followup_jobs(store, listing_ids)
  end

  def run_sync(store, max_pages:)
    result = store.sync_strategy.call(store, max_pages:,
      progress: StoreSync::ProgressTracker.new(store))
    apply_inventory_update(store, result)
  end

  def apply_inventory_update(store, result)
    updater = StoreSync::InventoryUpdater.new(store)
    listing_ids = updater.call(result.listings)
    remove_stale_if_complete(updater, result, listing_ids)
  end

  def remove_stale_if_complete(updater, result, listing_ids)
    updater.remove_stale(result.listings) if result.complete?
    listing_ids
  end

  def finalize_sync(store, sync_started_at)
    store.update_columns(sync_progress_pct: nil)
    sync_manager(store).mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: store.listings.count
    )
    Rails.logger.info("[FullStoreSyncJob] synced #{store.listings.count} listings for #{store.discogs_username}")
  end

  def dispatch_followup_jobs(store, listing_ids)
    EnrichmentJob.perform_later(store.id, listing_ids:) if listing_ids.any?
    DailyCurationJob.perform_later(store.id)
  end

  def sync_manager(store)
    StoreSync::StatusManager.new(store)
  end

  def mark_failed(store_id, error)
    store = Store.find_by(id: store_id)
    return unless store

    sync_manager(store).mark_failed!(error)
  end

  def log_failure(store_id, error)
    Rails.logger.error(
      "[FullStoreSyncJob] store=#{store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
  end
end
