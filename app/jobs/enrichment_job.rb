class EnrichmentJob < ApplicationJob
  queue_as :default

  def perform(store_id, listing_ids: nil)
    store = Store.find(store_id)

    service = EnrichmentService.new
    service.enrich_store(store, listing_ids:)
  rescue StandardError => error
    Rails.logger.error(
      "[EnrichmentJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    raise
  end
end
