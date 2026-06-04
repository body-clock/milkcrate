# frozen_string_literal: true

# Extracts Discogs listing IDs from order item payloads.
# Defensive parser that handles known shapes without raising on unexpected input.
module StoreSales
  class OrderListingIds
    # Extract listing IDs from an order hash.
    # Returns array of string IDs (Discogs listing IDs are strings).
    def self.call(order_hash)
      new(order_hash).call
    end

    def initialize(order_hash)
      @order_hash = order_hash || {}
    end

    def call
      return [] unless @order_hash.is_a?(Hash)

      items = extract_items
      listing_ids = items.flat_map { |item| extract_listing_id(item) }
      listing_ids.compact_blank.uniq
    end

    private

    def extract_items
      items = @order_hash["items"] || @order_hash[:items]
      Array.wrap(items)
    end

    def extract_listing_id(item)
      return nil unless item.is_a?(Hash)

      # In Discogs marketplace orders, item.id IS the listing identifier.
      # 'listing_id' is tried as a fallback for safety if the API shape changes.
      id = item["id"] || item[:id]
      id ||= item["listing_id"] || item[:listing_id]

      normalize_id(id)
    end

    def normalize_id(id)
      return nil if id.nil?

      id.to_s.presence
    end
  end
end
