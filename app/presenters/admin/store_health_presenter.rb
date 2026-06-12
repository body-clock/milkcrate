# Namespace for admin controllers and presenters.
module Admin
  class StoreHealthPresenter
    # Severity weights for sorting: lower weight = higher priority (needs attention first).
    SEVERITY_WEIGHTS = {
      "failed" => 0,
      "stale" => 1,
      "partial" => 2,
      "processing" => 3,
      "healthy" => 4
    }.freeze

    def initialize(store)
      @store = store
    end

    def severity_weight
      SEVERITY_WEIGHTS.fetch(health[:key], 4)
    end

    def sort_key
      if health[:key] == "failed"
        -(store.last_sync_error_at ? store.last_sync_error_at.to_f : 0)
      else
        store.last_synced_at ? store.last_synced_at.to_f : 0
      end
    end

    def props
      {
        id: store.id,
        name: store.name,
        discogs_username: store.discogs_username,
        total_listings: store.total_listings,
        inventory_page_count: store.inventory_page_count,
        sync_status: store.sync_status,
        sync_progress_pct: store.sync_progress_pct,
        enrichment_status: store.enrichment_status,
        enrichment_progress_pct: store.enrichment_progress_pct,
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
