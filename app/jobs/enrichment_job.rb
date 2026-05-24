# Job that enriches listing metadata (genres, images) from external APIs.
class EnrichmentJob < ApplicationJob
  limits_concurrency to: 1, key: ->(*) { "discogs_api" }
  queue_as :default

  def perform(store_id, listing_ids: nil)
    store = Store.find(store_id)
    store.update!(enrichment_progress_pct: 0)

    progress = StoreEnrichment::ProgressTracker.new(store)
    service = EnrichmentService.new(progress: progress)
    service.enrich_store(store, listing_ids:)

    store.update_columns(enrichment_progress_pct: nil)
  rescue StandardError => error
    Rails.logger.error(
      "[EnrichmentJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    raise
  end
end
