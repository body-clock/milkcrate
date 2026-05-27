# Namespace for sync strategies (public API, CSV export).
module SyncStrategies
  # Sync strategy that imports listings from the Discogs public API (app token).
  class PublicApi
    def initialize(client: nil, normalizer: nil)
      @client = client || DiscogsClient.new
      @normalizer = normalizer || StoreSync::ListingNormalizer.new
    end

    # Discogs public API limits pagination to 100 pages per sort order.
    # For stores with more than 100 pages, we do two passes (desc + asc)
    # to get up to 2x coverage — the pages don't overlap across sort orders.
    DISCOGS_PAGE_LIMIT = 100

    # Fetches inventory from the Discogs public API and returns normalized listings.
    # Performs two passes (desc + asc) to maximize coverage across paginated results.
    #
    # Returns SyncStrategies::Result with:
    #   listings  — array of normalized listing hashes (nil entries filtered out)
    #   complete? — false (public API is paginated and may be incomplete)
    def call(store, max_pages: nil, progress: nil)
      total_pages = probe_pages(store)
      setup_progress(progress, fetchable_pages(total_pages, max_pages), total_pages)
      fetch_all_pages(store, total_pages, max_pages:, progress:)
    end

    def fetch_all_pages(store, total_pages, max_pages:, progress:)
      desc_result = fetch_listings(store, sort_order: "desc", max_pages:, progress:)
      asc_result = fetch_asc_if_needed(store, total_pages, max_pages:, progress:)
      build_result(desc_result, asc_result, store)
    end

    def probe_pages(store)
      probe = @client.seller_inventory(store.discogs_username, page: 1, sort_order: "desc")
      probe.dig("pagination", "pages") || 1
    end

    def fetchable_pages(total_pages, max_pages)
      if max_pages
        [ total_pages, max_pages, DISCOGS_PAGE_LIMIT ].min
      else
        [ total_pages, DISCOGS_PAGE_LIMIT ].min
      end
    end

    def setup_progress(progress, fetchable, total_pages)
      return unless progress
      passes = total_pages > DISCOGS_PAGE_LIMIT ? 2 : 1
      progress.total = fetchable * passes
    end

    def fetch_asc_if_needed(store, total_pages, max_pages:, progress:)
      return SyncStrategies::Result.new(listings: [], complete: false) unless total_pages > DISCOGS_PAGE_LIMIT

      fetch_listings(store, sort_order: "asc", max_pages:, progress:)
    end

    def build_result(desc_result, asc_result, store)
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
