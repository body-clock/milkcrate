# frozen_string_literal: true

require "rails_helper"

RSpec.describe StoreSales::PollStateTracker do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }
  let(:tracker) { described_class.new(store) }

  describe "#mark_success" do
    it "sets last_sales_polled_at" do
      travel_to(Time.current) do
        tracker.mark_success
        expect(store.reload.last_sales_polled_at).to be_within(1.second).of(Time.current)
      end
    end

    it "clears previous error state" do
      store.update!(
        last_sales_poll_error: "Previous failure",
        last_sales_poll_error_at: 1.hour.ago
      )

      tracker.mark_success

      expect(store.reload.last_sales_poll_error).to be_nil
      expect(store.reload.last_sales_poll_error_at).to be_nil
    end
  end

  describe "#mark_failure" do
    let(:error) { RuntimeError.new("something broke") }

    before do
      allow(error).to receive(:backtrace).and_return([
        "file1.rb:10:in `method_a'",
        "file2.rb:20:in `method_b'"
      ])
    end

    it "records the error message and backtrace" do
      travel_to(Time.current) do
        tracker.mark_failure(error)

        expect(store.reload.last_sales_poll_error).to include("RuntimeError: something broke")
        expect(store.reload.last_sales_poll_error).to include("file1.rb:10")
        expect(store.reload.last_sales_poll_error_at).to be_within(1.second).of(Time.current)
      end
    end
  end

  describe "#advance_cursor" do
    it "updates the poll cursor timestamp" do
      timestamp = Time.parse("2026-06-04T13:00:00Z")

      tracker.advance_cursor(timestamp)

      expect(store.reload.sales_poll_cursor_at).to eq(timestamp)
    end
  end
end
