# Coordinates full inventory synchronization for a store across strategies.
class StoreSyncService
  # Dev-console helper for quick syncs. For production syncs, use FullStoreSyncJob
  # which delegates to SyncStrategies::PublicApi or SyncStrategies::CsvExport.
  def initialize(store, client: DiscogsClient.new, normalizer: StoreSync::ListingNormalizer.new, progress: nil)
    @store = store
    @client = client
    @normalizer = normalizer
    @progress = progress
  end

  def full_sync(max_pages: nil, sort_order: "desc")
    perform_sync(max_pages:, sort_order:)
  rescue StandardError => e
    StoreSync::StatusManager.new(@store).mark_failed!(e)
    raise
  end

  private

  def perform_sync(max_pages:, sort_order:)
    sync_started_at = start_sync
    result = fetch_inventory(sort_order:, max_pages:)
    complete_sync(result, sync_started_at)
  end

  def start_sync
    started_at = Time.current
    @store.update!(sync_status: "syncing")
    started_at
  end

  def fetch_inventory(sort_order:, max_pages:)
    fetcher = StoreSync::InventoryFetcher.new(@store, client: @client, progress: @progress)
    fetcher.fetch(sort_order:, max_pages:)
  end

  def complete_sync(result, sync_started_at)
    import_listings(result.listings)
    mark_succeeded(sync_started_at)
    result.listings.size
  end

  def mark_succeeded(sync_started_at)
    StoreSync::StatusManager.new(@store).mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: @store.listings.count
    )
  end

  def import_listings(raw_listings)
    import_normalized_records(raw_listings)
  rescue StandardError => e
    Rails.logger.error("[StoreSyncService] upsert_all failed: #{e.message}")
    raise
  end

  def import_normalized_records(raw_listings)
    records = normalized_records(raw_listings)
    return if records.empty?

    upsert_listings(deduplicated(records))
  end

  def normalized_records(raw_listings)
    raw_listings.filter_map { |raw| @normalizer.call(raw, store_id: @store.id) }
  end

  # Discogs inventory pages can repeat listings, which a batch upsert rejects.
  def deduplicated(records)
    records.uniq { |record| record[:discogs_listing_id] }
  end

  def upsert_listings(records)
    @store.listings.upsert_all(
      records,
      unique_by: :discogs_listing_id,
      update_only: %i[
        discogs_release_id artist title label year
        format genres styles condition price currency
        thumbnail_url notes listed_at last_seen_at
      ]
    )
  end
end
