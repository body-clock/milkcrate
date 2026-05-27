# Job that enriches listing metadata (genres, images) from external APIs.
class EnrichmentJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, listing_ids: nil)
    store = Store.find(store_id)
    run_with_progress(store, listing_ids:)
  rescue StandardError => error
    log_failure(store || store_id, error)
    raise
  end

  private

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

  def run_with_progress(store, listing_ids:)
    setup_progress(store)
    run_enrichment(store, listing_ids:)
    clear_progress(store)
  end

  def log_failure(store_or_id, error)
    name = store_or_id.respond_to?(:discogs_username) ? store_or_id.discogs_username : store_or_id
    Rails.logger.error(
      "[EnrichmentJob] store=#{name} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
  end
end
