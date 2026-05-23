# Namespace for sync strategies (public API, CSV export).
module SyncStrategies
  # Sync strategy that imports listings from the Discogs public API (app token).
  class PublicApi
    def initialize(client: nil, normalizer: nil)
      @client = client || DiscogsClient.new
      @normalizer = normalizer || StoreSync::ListingNormalizer.new
    end

    # Fetches inventory from the Discogs public API and returns normalized listings.
    # Performs two passes (desc + asc) to maximize coverage across paginated results.
    #
    # Returns SyncStrategies::Result with:
    #   listings  — array of normalized listing hashes (nil entries filtered out)
    #   complete? — false (public API is paginated and may be incomplete)
    def call(store, max_pages: nil)
      desc_result = fetch_listings(store, sort_order: "desc", max_pages:)
      asc_result = fetch_listings(store, sort_order: "asc", max_pages:)

      all_raw = desc_result.listings + asc_result.listings
      normalized = all_raw.filter_map { |raw| normalize(raw, store) }

      SyncStrategies::Result.new(listings: normalized, complete: false)
    end

    private

    def fetch_listings(store, sort_order:, max_pages:)
      fetcher = StoreSync::InventoryFetcher.new(store, client: @client)
      fetcher.fetch(sort_order:, max_pages:)
    end

    def normalize(raw, store)
      @normalizer.call(raw, store_id: store.id)
    end
  end
end
