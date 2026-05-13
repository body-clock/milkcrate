class EnrichmentJob < ApplicationJob
  queue_as :default

  def perform(store_id, listing_ids: nil)
    store = Store.find(store_id)
    service = EnrichmentService.new

    service.enrich_releases(store, listing_ids:)
    service.enrich_music_brainz_images(store)
  end
end
