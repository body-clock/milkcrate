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
    def call(store, max_pages: nil, progress: nil)
      # Probe page 1 to get total pages — used for progress tracking and pass count
      probe = @client.seller_inventory(store.discogs_username, page: 1, sort_order: "desc")
      total_pages = probe.dig("pagination", "pages") || 1
      capped = max_pages ? [ total_pages, max_pages ].min : total_pages
      passes = capped > 5 ? 2 : 1

      if progress
        progress.total = capped * passes
      end

      desc_result = fetch_listings(store, sort_order: "desc", max_pages:, progress:)
      asc_result = if passes > 1
        fetch_listings(store, sort_order: "asc", max_pages:, progress:)
      else
        SyncStrategies::Result.new(listings: [], complete: false)
      end

      all_raw = desc_result.listings + asc_result.listings
      normalized = all_raw.filter_map { |raw| normalize(raw, store) }

      SyncStrategies::Result.new(listings: normalized, complete: false)
    end

    private

    def fetch_listings(store, sort_order:, max_pages:, progress: nil)
      fetcher = StoreSync::InventoryFetcher.new(store, client: @client, progress: progress)
      fetcher.fetch(sort_order:, max_pages:)
    end

    def normalize(raw, store)
      @normalizer.call(raw, store_id: store.id)
    end
  end
end
