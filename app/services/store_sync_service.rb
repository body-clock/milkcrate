class StoreSyncService
  Result = Data.define(:listing_ids_for_enrichment, :catalog_coverage, :inventory_page_count)

  def initialize(store)
    @store = store
    @client = DiscogsClient.new
    @normalizer = StoreSync::ListingNormalizer.new
  end

  # Full sync: crawls all pages. Pass max_pages: 1 for a quick 100-record dev sync.
  # Pass manage_status: false to skip all sync_status/last_synced_at/total_listings updates
  # (useful when the caller manages status externally, e.g. FullStoreSyncJob).
  def full_sync(max_pages: nil, sort_order: "desc", manage_status: true)
    sync_started_at = Time.current
    @store.update!(sync_status: "syncing") if manage_status
    page = 1
    total_imported = 0

    loop do
      data = @client.seller_inventory(@store.discogs_username, page: page, sort_order: sort_order)
      listings = data["listings"] || []
      break if listings.empty?

      import_listings(listings)
      total_imported += listings.size

      pagination = data["pagination"] || {}
      break if page >= (pagination["pages"] || 1)
      break if max_pages && page >= max_pages

      page += 1
      sleep(0.5) # be kind to the API
    rescue DiscogsClient::ApiError => e
      raise unless e.message.include?("Pagination above 100")
      Rails.logger.info "[StoreSyncService] Hit Discogs 100-page limit for #{@store.discogs_username}, stopping at page #{page}"
      break
    end

    if manage_status
      @store.update!(
        sync_status: "idle",
        last_synced_at: sync_started_at,
        total_listings: @store.listings.count
      )
    end

    total_imported
  rescue StandardError => e
    @store.update!(sync_status: "failed") if manage_status
    raise
  end

  def sync(max_pages: nil, manage_status: true)
    sync_started_at = Time.current
    @store.update!(sync_status: "syncing") if manage_status

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

    if manage_status
      @store.update!(
        sync_status: "idle",
        last_synced_at: sync_started_at,
        total_listings: @store.listings.count,
        catalog_coverage:,
        inventory_page_count: observed_page_count
      )
    end

    Result.new(
      listing_ids_for_enrichment: reconciliation.listing_ids_for_enrichment,
      catalog_coverage:,
      inventory_page_count: observed_page_count
    )
  rescue StandardError
    @store.update!(sync_status: "failed") if manage_status
    raise
  end


  private

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
    page = 1
    page_count = 0
    fetched_listings = []

    loop do
      data = @client.seller_inventory(@store.discogs_username, page:, sort_order:)
      listings = data["listings"] || []
      pagination = data["pagination"] || {}
      page_count = [ page_count, pagination.fetch("pages", page).to_i, page ].max

      fetched_listings.concat(listings)
      break if listings.empty?
      break if page >= page_count
      break if max_pages && page >= max_pages

      page += 1
      sleep(0.5)
    rescue DiscogsClient::ApiError => e
      raise unless e.message.include?("Pagination above 100")
      Rails.logger.info "[StoreSyncService] Hit Discogs 100-page limit for #{@store.discogs_username}, stopping at page #{page}"
      break
    end

    { listings: fetched_listings, page_count: page_count }
  end
end
