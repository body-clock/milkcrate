# frozen_string_literal: true

# Manages store state transitions during a sales poll cycle:
# recording success (clearing errors), recording failure (saving
# error diagnostics), and advancing the high-water cursor timestamp.
module StoreSales
  class PollStateTracker
    def initialize(store)
      @store = store
    end

    def mark_success
      @store.update!(
        last_sales_polled_at: Time.current,
        last_sales_poll_error: nil,
        last_sales_poll_error_at: nil
      )
    end

    def mark_failure(error)
      summary = "#{error.class}: #{error.message}"
      backtrace = Array(error.backtrace).first(8)
      @store.update_columns(
        last_sales_poll_error: ([ summary ] + backtrace).join("\n"),
        last_sales_poll_error_at: Time.current
      )
    end

    def advance_cursor(timestamp)
      @store.update!(sales_poll_cursor_at: timestamp)
    end
  end
end
