# frozen_string_literal: true

# Handles deduplication and persistence of Discogs order events during
# sales polling. Owns the decision of whether an order has already been
# processed and the upsert of event records with removal metadata.
module StoreSales
  class OrderEventProcessor
    def initialize(store)
      @store = store
    end

    # Returns nil if the order was processed recently (within 1 minute
    # of its last_activity timestamp), or the order_id string if it
    # should be processed.
    def deduplicate(order)
      order_id = order["id"].to_s
      existing = @store.discogs_order_events.find_by(discogs_order_id: order_id)
      return nil if already_processed?(existing, order)

      order_id
    end

    # Upsert the order event record with current status, listing IDs,
    # and removal metadata.
    def record(order_id, order, listing_ids, removal_result)
      event = @store.discogs_order_events.find_or_initialize_by(discogs_order_id: order_id)
      event.assign_attributes(
        status: order["status"],
        last_activity_at: parse_timestamp(order["last_activity"]),
        listing_ids: listing_ids,
        removed_listing_count: removal_result[:removed_count],
        processed_at: Time.current
      )
      event.save!
    end

    private

    def already_processed?(event, order)
      return false unless event&.processed_at.present?

      activity = parse_timestamp(order["last_activity"])
      return false unless activity

      event.processed_at >= activity - 1.minute
    end

    def parse_timestamp(value)
      return nil if value.blank?

      Time.parse(value.to_s)
    rescue ArgumentError
      nil
    end
  end
end
