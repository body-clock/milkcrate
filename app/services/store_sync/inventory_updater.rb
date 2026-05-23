# Namespace for store sync components (fetch, normalize, reconcile, status).
module StoreSync
  # Handles importing listings from a Discogs inventory fetch and removing
  # listings that are no longer present. Extracted from FullStoreSyncJob so
  # the job focuses on orchestration (concurrency limiting, status tracking,
  # enrichment dispatch) while this object owns the data lifecycle.
  class InventoryUpdater
    UPDATE_FIELDS = %i[
      discogs_release_id artist title label year
      condition price currency
      thumbnail_url notes listed_at last_seen_at
    ].freeze

    def initialize(store)
      @store = store
    end

    # Import or update listings from the fetched Discogs records.
    # Returns listing IDs that changed and need enrichment.
    def call(listings)
      return [] if listings.empty?

      records = listings.index_by { |r| r[:discogs_listing_id] }
      existing = @store.listings
        .where(discogs_listing_id: records.keys)
        .index_by(&:discogs_listing_id)

      changed_ids = records.filter_map do |id, record|
        existing_record = existing[id]
        id if existing_record.nil? || materially_changed?(existing_record, record)
      end

      @store.listings.upsert_all(
        records.values,
        unique_by: :discogs_listing_id,
        update_only: UPDATE_FIELDS
      )

      @store.listings
        .where(discogs_listing_id: changed_ids)
        .pluck(:id)
    end

    # Remove listings that were not returned by the current sync.
    def remove_stale(listings)
      current_ids = listings.map { |r| r[:discogs_listing_id] }

      if current_ids.empty?
        @store.listings.delete_all
      else
        @store.listings
          .where.not(discogs_listing_id: current_ids)
          .delete_all
      end
    end

    private

    def materially_changed?(existing, incoming)
      differing?(
        [ existing.discogs_release_id.to_s, incoming[:discogs_release_id].to_s ],
        [ normalized_price(existing.price), normalized_price(incoming[:price]) ],
        [ existing.condition, incoming[:condition] ],
        [ existing.notes, incoming[:notes] ]
      )
    end

    def differing?(*pairs)
      pairs.any? { |a, b| a != b }
    end

    def normalized_price(value)
      value.present? ? BigDecimal(value.to_s) : nil
    end
  end
end
