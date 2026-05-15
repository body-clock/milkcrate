class EnrichmentJob < ApplicationJob
  queue_as :default

  def perform(store_id, listing_ids: nil)
    store = Store.find(store_id)
    store.update!(enrichment_status: "enriching")

    service = EnrichmentService.new
    service.enrich_releases(store, listing_ids:)
    service.enrich_music_brainz_images(store)

    store.update!(enrichment_status: "idle", last_enriched_at: Time.current)
  rescue StandardError => error
    Rails.logger.error(
      "[EnrichmentJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    store&.update!(enrichment_status: "failed")
    raise
  end
end
