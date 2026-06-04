# frozen_string_literal: true

require "rails_helper"

RSpec.describe StoreSales::OrderEventProcessor do
  let(:store) { create(:store) }
  let(:processor) { described_class.new(store) }

  describe "#deduplicate" do
    let(:order) do
      {
        "id" => "order-123",
        "status" => "New Order",
        "last_activity" => "2026-06-04T12:00:00Z"
      }
    end

    it "returns the order_id when no event exists" do
      expect(processor.deduplicate(order)).to eq("order-123")
    end

    it "returns nil when an event was recently processed for this activity" do
      DiscogsOrderEvent.create!(
        store: store,
        discogs_order_id: "order-123",
        status: "New Order",
        last_activity_at: Time.parse("2026-06-04T12:00:00Z"),
        listing_ids: [],
        removed_listing_count: 0,
        processed_at: Time.parse("2026-06-04T12:00:01Z")
      )

      expect(processor.deduplicate(order)).to be_nil
    end

    it "returns the order_id when the existing event was processed long ago" do
      DiscogsOrderEvent.create!(
        store: store,
        discogs_order_id: "order-123",
        status: "New Order",
        last_activity_at: Time.parse("2026-06-04T10:00:00Z"),
        listing_ids: [],
        removed_listing_count: 0,
        processed_at: Time.parse("2026-06-04T10:00:00Z")
      )

      expect(processor.deduplicate(order)).to eq("order-123")
    end

    it "returns the order_id when last_activity is missing (nil timestamp)" do
      order_no_activity = { "id" => "order-456", "status" => "New Order" }

      expect(processor.deduplicate(order_no_activity)).to eq("order-456")
    end
  end

  describe "#record" do
    let(:order) do
      {
        "id" => "order-123",
        "status" => "Shipped",
        "last_activity" => "2026-06-04T13:00:00Z"
      }
    end
    let(:listing_ids) { [ "123", "456" ] }
    let(:removal_result) { { removed_count: 2, removed_listing_ids: [ "123", "456" ] } }

    it "creates a new event when none exists" do
      expect {
        processor.record("order-123", order, listing_ids, removal_result)
      }.to change(DiscogsOrderEvent, :count).by(1)

      event = DiscogsOrderEvent.last
      expect(event.store).to eq(store)
      expect(event.discogs_order_id).to eq("order-123")
      expect(event.status).to eq("Shipped")
      expect(event.last_activity_at).to eq(Time.parse("2026-06-04T13:00:00Z"))
      expect(event.listing_ids).to eq([ "123", "456" ])
      expect(event.removed_listing_count).to eq(2)
      expect(event.processed_at).to be_present
    end

    it "updates an existing event with new activity data" do
      existing = DiscogsOrderEvent.create!(
        store: store,
        discogs_order_id: "order-123",
        status: "New Order",
        last_activity_at: Time.parse("2026-06-04T12:00:00Z"),
        listing_ids: [ "123" ],
        removed_listing_count: 1,
        processed_at: Time.parse("2026-06-04T12:00:00Z")
      )

      processor.record("order-123", order, listing_ids, removal_result)

      existing.reload
      expect(existing.status).to eq("Shipped")
      expect(existing.last_activity_at).to eq(Time.parse("2026-06-04T13:00:00Z"))
      expect(existing.listing_ids).to eq([ "123", "456" ])
      expect(existing.removed_listing_count).to eq(2)
    end
  end
end
