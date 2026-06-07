# Job that enriches listing metadata (genres, images) from external APIs.
class EnrichmentJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, listing_ids: nil)
    run_with_progress(store_id, listing_ids:)
  rescue StandardError => error
    log_failure(store_id, error)
    raise
  end

  private

  def run_with_progress(store_id, listing_ids:)
    store = Store.find_by(id: store_id)
    return Rails.logger.warn("[EnrichmentJob] store=#{store_id} not found, skipping") unless store

    setup_progress(store)
    run_enrichment(store, listing_ids:)
    clear_progress(store)
  end

  def setup_progress(store)
    store.update!(enrichment_progress_pct: 0)
  end

  def run_enrichment(store, listing_ids:)
    progress = StoreEnrichment::ProgressTracker.new(store)
    EnrichmentService.new(progress: progress).enrich_store(store, listing_ids:)
  end

  def clear_progress(store)
    store.update_columns(enrichment_progress_pct: nil)
  end

  def log_failure(store_id, error)
    name = Store.find_by(id: store_id)&.discogs_username || store_id
    Rails.logger.error(
      "[EnrichmentJob] store=#{name} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
  end
end
