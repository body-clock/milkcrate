# frozen_string_literal: true

# Removes sold listings from a store and updates inventory version.
# Matches by discogs_listing_id, scoped to the store to prevent cross-store deletion.
# Idempotent: calling multiple times with the same IDs has no additional effect.
module StoreSales
  class SoldListingRemover
    def initialize(store)
      @store = store
    end

    # Delete listings matching the given discogs_listing_ids.
    # Returns a result hash with removed_count and removed_listing_ids.
    def call(listing_ids)
      ids_to_remove = Array.wrap(listing_ids).compact_blank.uniq
      return empty_result if ids_to_remove.empty?

      removed = find_and_delete_listings(ids_to_remove)
      update_store_state if removed.any?

      build_result(removed)
    end

    private

    def find_and_delete_listings(ids)
      removed = @store.listings.where(discogs_listing_id: ids).pluck(:discogs_listing_id)
      return [] if removed.empty?

      @store.listings.where(discogs_listing_id: removed).delete_all
      removed
    end

    def update_store_state
      ActiveRecord::Base.transaction do
        @store.increment_inventory_version!
        @store.update!(total_listings: @store.listings.count)
      end
    end

    def build_result(removed_ids)
      {
        removed_count: removed_ids.size,
        removed_listing_ids: removed_ids
      }
    end

    def empty_result
      { removed_count: 0, removed_listing_ids: [] }
    end
  end
end
