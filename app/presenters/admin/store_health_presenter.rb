# Namespace for admin controllers and presenters.
module Admin
  # Serializes store health metrics for the admin monitoring view.
  class StoreHealthPresenter
    def initialize(store)
      @store = store
    end

    def props
      {
        id: store.id,
        name: store.name,
        discogs_username: store.discogs_username,
        total_listings: store.total_listings,
        inventory_page_count: store.inventory_page_count,
        sync_status: store.sync_status,
        enrichment_status: store.enrichment_status,
        catalog_coverage: store.catalog_coverage,
        last_synced_at: iso_time(store.last_synced_at),
        last_enriched_at: iso_time(store.last_enriched_at),
        last_sync_error_at: iso_time(store.last_sync_error_at),
        storefront_path: "/#{store.discogs_username}",
        health: health
      }
    end

    private

    attr_reader :store

    def health
      StoreHealth.new(store).props
    end

    def iso_time(time)
      time&.iso8601
    end
  end
end
