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
    sync_started_at = Time.current
    @store.update!(sync_status: "syncing")

    fetcher = StoreSync::InventoryFetcher.new(@store, client: @client, progress: @progress)
    result = fetcher.fetch(sort_order: sort_order, max_pages: max_pages)

    import_listings(result.listings)

    StoreSync::StatusManager.new(@store).mark_succeeded!(
      last_synced_at: sync_started_at,
      total_listings: @store.listings.count
    )

    result.listings.size
  rescue StandardError => e
    StoreSync::StatusManager.new(@store).mark_failed!(e)
    raise
  end

  private

  def import_listings(raw_listings)
    records = raw_listings.filter_map { |raw| @normalizer.call(raw, store_id: @store.id) }
    return if records.empty?

    # Deduplicate by discogs_listing_id — the Discogs inventory API can
    # return the same listing across multiple pages, and upsert_all chokes
    # on duplicate conflict targets in the same batch.
    records = records.uniq { |r| r[:discogs_listing_id] }

    @store.listings.upsert_all(
      records,
      unique_by: :discogs_listing_id,
      update_only: %i[
        discogs_release_id artist title label year
        format genres styles condition price currency
        thumbnail_url notes listed_at last_seen_at
      ]
    )
  rescue StandardError => e
    Rails.logger.error("[StoreSyncService] upsert_all failed: #{e.message}")
    raise
  end
end
