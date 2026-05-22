class StoreSyncService
  Result = Data.define(:listing_ids_for_enrichment, :catalog_coverage, :inventory_page_count)

  def initialize(store)
    @store = store
    @client = DiscogsClient.new
    @normalizer = StoreSync::ListingNormalizer.new
  end

  # Full sync: crawls all pages. Pass max_pages: 1 for a quick 100-record dev sync.
  def full_sync(max_pages: nil, sort_order: "desc")
    sync_started_at = Time.current
    @store.update!(sync_status: "syncing")

    fetcher = StoreSync::InventoryFetcher.new(@store, client: @client)
    result = fetcher.fetch(sort_order: sort_order, max_pages: max_pages)

    import_listings(result.listings)

    sync_manager.mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: @store.listings.count
    )

    result.listings.size
  rescue StandardError => e
    sync_manager.mark_failed!(e)
    raise
  end

  def sync(max_pages: nil)
    sync_started_at = Time.current
    @store.update!(sync_status: "syncing")

    desc_result = fetch_public_listings(sort_order: "desc", max_pages:)
    asc_result = fetch_public_listings(sort_order: "asc", max_pages:)
    observed_page_count = [ desc_result[:page_count], asc_result[:page_count] ].max
    catalog_coverage = StoreSync::CoverageClassifier.new(
      observed_page_count:,
      max_pages:
    ).call

    reconciliation = StoreSync::ListingReconciler.new(
      store: @store,
      fetched_listings: desc_result[:listings] + asc_result[:listings],
      normalizer: @normalizer
    ).call

    sync_manager.mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: @store.listings.count,
      catalog_coverage:,
      inventory_page_count: observed_page_count
    )

    Result.new(
      listing_ids_for_enrichment: reconciliation.listing_ids_for_enrichment,
      catalog_coverage:,
      inventory_page_count: observed_page_count
    )
  rescue StandardError => e
    sync_manager.mark_failed!(e)
    raise
  end

  private

  def sync_manager
    @sync_manager ||= StoreSync::StatusManager.new(@store)
  end

  def import_listings(raw_listings)
    records = raw_listings.filter_map { |raw| @normalizer.call(raw, store_id: @store.id) }
    return if records.empty?

    @store.listings.upsert_all(
      records,
      unique_by: :discogs_listing_id,
      update_only: %i[condition price currency format thumbnail_url last_seen_at notes]
    )
  rescue StandardError => e
    Rails.logger.error("[StoreSyncService] upsert_all failed: #{e.message}")
    raise
  end

  def fetch_public_listings(sort_order:, max_pages:)
    fetcher = StoreSync::InventoryFetcher.new(@store, client: @client)
    result = fetcher.fetch(sort_order: sort_order, max_pages: max_pages)

    {
      listings: result.listings,
      page_count: [ result.pages_fetched, result.total_pages.to_i ].max
    }
  end
end
