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

    def call(store, max_pages: nil, progress: nil)
      total_pages, fetchable, passes = probe_pages(store, max_pages)
      setup_progress(progress, fetchable, passes)
      desc_raw = fetch_listings(store, sort_order: "desc", max_pages:, progress:)
      asc_raw = fetch_asc_pass(store, total_pages, max_pages:, progress:)
      normalize_result(desc_raw, asc_raw, store)
    end

    private

    def probe_pages(store, max_pages)
      probe = @client.seller_inventory(store.discogs_username, page: 1, sort_order: "desc")
      total_pages = probe.dig("pagination", "pages") || 1
      needs_two_pass = total_pages > DISCOGS_PAGE_LIMIT
      fetchable = [ total_pages, max_pages, DISCOGS_PAGE_LIMIT ].compact.min
      [ total_pages, fetchable, needs_two_pass ? 2 : 1 ]
    end

    def setup_progress(progress, fetchable, passes)
      progress.total = fetchable * passes if progress
    end

    def fetch_asc_pass(store, total_pages, max_pages:, progress:)
      return SyncStrategies::Result.new(listings: [], complete: false) unless total_pages > DISCOGS_PAGE_LIMIT

      fetch_listings(store, sort_order: "asc", max_pages:, progress:)
    end

    def normalize_result(desc_raw, asc_raw, store)
      all_raw = desc_raw.listings + asc_raw.listings
      normalized = all_raw.filter_map { |raw| @normalizer.call(raw, store_id: store.id) }
      SyncStrategies::Result.new(listings: normalized, complete: false)
    end

    def fetch_listings(store, sort_order:, max_pages:, progress: nil)
      fetcher = StoreSync::InventoryFetcher.new(store, client: @client, progress: progress)
      fetcher.fetch(sort_order:, max_pages:)
    end
  end
end
