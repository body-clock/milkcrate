# frozen_string_literal: true

# Polls recent Discogs marketplace orders for a store, deduplicates events,
# removes sold listings, and advances the cursor. Uses OAuth credentials
# from the store's store_owner.
module StoreSales
  class OrderPoller
    def initialize(store)
      @store = store
    end

    def call
      with_error_handling do
        ensure_oauth_authorized!
        process_orders(fetch_recent_orders).tap { mark_success }
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
      advance_cursor(stats[:max_activity]) if stats[:max_activity]
      build_result(stats[:processed_count], stats[:total_removed], stats[:max_activity].present?)
    end

    def process_each_order(orders)
      results = orders.filter_map { |order| process_single_order(order) }
      aggregate_results(results)
    end

    def process_single_order(order)
      order_id = processing_order_id(order) or return nil
      listing_ids = OrderListingIds.call(order)
      result = SoldListingRemover.new(@store).call(listing_ids)
      persist_event(order_id, order, listing_ids, result)
      activity_result(order, result)
    end

    def processing_order_id(order)
      order_id = order["id"].to_s
      already_processed_recently?(find_existing_event(order_id), order) ? nil : order_id
    end

    def activity_result(order, result)
      { activity: parse_timestamp(order["last_activity"]), removed_count: result[:removed_count] }
    end

    def find_existing_event(order_id)
      @store.discogs_order_events.find_by(discogs_order_id: order_id)
    end

    def already_processed_recently?(event, order)
      return false unless event&.processed_at.present?

      current_activity = parse_timestamp(order["last_activity"])
      return false unless current_activity

      event.processed_at >= current_activity - 1.minute
    end

    def persist_event(order_id, order, listing_ids, removal_result)
      event = find_or_init_event(order_id)
      assign_event_attributes(event, order, listing_ids, removal_result)
      event.save!
    end

    def find_or_init_event(order_id)
      @store.discogs_order_events.find_or_initialize_by(discogs_order_id: order_id)
    end

    def assign_event_attributes(event, order, listing_ids, removal_result)
      event.assign_attributes(
        status: order["status"],
        last_activity_at: parse_timestamp(order["last_activity"]),
        listing_ids: listing_ids,
        removed_listing_count: removal_result[:removed_count],
        processed_at: Time.current
      )
    end

    def advance_cursor(max_activity)
      @store.update!(sales_poll_cursor_at: max_activity)
    end

    def mark_success
      @store.update!(
        last_sales_polled_at: Time.current,
        last_sales_poll_error: nil,
        last_sales_poll_error_at: nil
      )
    end

    def mark_failure(error)
      @store.update_columns(
        last_sales_poll_error: summarize_error(error),
        last_sales_poll_error_at: Time.current
      )
    end

    def summarize_error(error)
      summary = "#{error.class}: #{error.message}"
      backtrace = Array(error.backtrace).first(8)
      ([ summary ] + backtrace).join("\n")
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
      mark_failure(e)
      raise
    end

    def build_client
      DiscogsClient.new(
        access_token: @store.discogs_oauth_token,
        access_token_secret: @store.discogs_oauth_token_secret
      )
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
