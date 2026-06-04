# frozen_string_literal: true

# Orchestrates a single sales-poll cycle: fetches recent marketplace
# orders, deduplicates, removes sold listings, and advances the cursor.
module StoreSales
  class OrderPoller
    def initialize(store, event_processor: nil, state_tracker: nil)
      @store = store
      @event_processor = event_processor || OrderEventProcessor.new(store)
      @state_tracker = state_tracker || PollStateTracker.new(store)
    end

    def call
      with_error_handling do
        ensure_oauth_authorized!
        process_orders(fetch_recent_orders).tap { @state_tracker.mark_success }
      end
    end

    private

    def ensure_oauth_authorized!
      return if @store.oauth_authorized?

      raise Discogs::Errors::ApiError, "OAuth authorization required for sales polling"
    end

    def fetch_recent_orders
      response = build_client.list_orders(sort: "last_activity", sort_order: "desc")
      Array.wrap(response["orders"])
    end

    def process_orders(orders)
      return empty_result if orders.empty?

      stats = process_each_order(orders)
      @state_tracker.advance_cursor(stats[:max_activity]) if stats[:max_activity]
      build_result(stats[:processed_count], stats[:total_removed], stats[:max_activity].present?)
    end

    def process_each_order(orders)
      results = orders.filter_map { |order| process_single_order(order) }
      aggregate_results(results)
    end

    def process_single_order(order)
      order_id = @event_processor.deduplicate(order) or return nil
      listing_ids = OrderListingIds.call(order)
      result = SoldListingRemover.new(@store).call(listing_ids)
      @event_processor.record(order_id, order, listing_ids, result)
      activity_result(order, result)
    end

    def activity_result(order, result)
      {
        activity: parse_timestamp(order["last_activity"]),
        removed_count: result[:removed_count]
      }
    end

    def parse_timestamp(value)
      return nil if value.blank?

      Time.parse(value.to_s)
    rescue ArgumentError
      nil
    end

    def aggregate_results(results)
      {
        processed_count: results.size,
        total_removed: results.sum { |r| r[:removed_count] },
        max_activity: results.map { |r| r[:activity] }.compact.max
      }
    end

    def with_error_handling
      yield
    rescue StandardError => e
      @state_tracker.mark_failure(e)
      raise
    end

    def build_client
      @store.discogs_oauth_client
    end

    def empty_result
      build_result(0, 0, false)
    end

    def build_result(order_count, removed_count, cursor_advanced)
      {
        order_count: order_count,
        removed_count: removed_count,
        cursor_advanced: cursor_advanced
      }
    end
  end
end
