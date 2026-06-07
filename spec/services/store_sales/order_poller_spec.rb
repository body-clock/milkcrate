# frozen_string_literal: true

require "rails_helper"

RSpec.describe StoreSales::OrderPoller do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }
  let(:store_owner) { create(:store_owner) }
  let(:client) { instance_double(DiscogsClient) }

  before do
    store.update!(store_owner: store_owner)
    allow(DiscogsClient).to receive(:new).and_return(client)
  end

  describe "#call" do
    context "with OAuth authorized store" do
      let(:orders_response) do
        {
          "orders" => [
            {
              "id" => "order-123",
              "status" => "New Order",
              "last_activity" => "2026-06-04T12:00:00Z",
              "items" => [ { "id" => 41578242 } ]
            }
          ]
        }
      end

      before do
        allow(client).to receive(:list_orders).and_return(orders_response)
        create(:listing, store: store, discogs_listing_id: "41578242")
      end

      it "polls recent orders and removes sold listings" do
        result = described_class.new(store).call

        expect(result[:order_count]).to eq(1)
        expect(result[:removed_count]).to eq(1)
        expect(result[:cursor_advanced]).to be true
        expect(store.listings.where(discogs_listing_id: "41578242")).to be_empty
      end

      it "creates DiscogsOrderEvent for processed orders" do
        expect {
          described_class.new(store).call
        }.to change(DiscogsOrderEvent, :count).by(1)

        event = DiscogsOrderEvent.last
        expect(event.store).to eq(store)
        expect(event.discogs_order_id).to eq("order-123")
        expect(event.status).to eq("New Order")
        expect(event.removed_listing_count).to eq(1)
        expect(event.processed_at).to be_present
      end

      it "advances cursor to max last_activity timestamp" do
        travel_to(Time.current) do
          described_class.new(store).call
          expect(store.reload.sales_poll_cursor_at).to eq(Time.parse("2026-06-04T12:00:00Z"))
        end
      end

      it "marks last_sales_polled_at on success" do
        travel_to(Time.current) do
          described_class.new(store).call
          expect(store.reload.last_sales_polled_at).to be_within(1.second).of(Time.current)
        end
      end

      it "clears previous error state on success" do
        store.update!(
          last_sales_poll_error: "Previous error",
          last_sales_poll_error_at: 1.hour.ago
        )

        described_class.new(store).call

        expect(store.reload.last_sales_poll_error).to be_nil
        expect(store.reload.last_sales_poll_error_at).to be_nil
      end
    end

    context "without OAuth authorization" do
      before do
        store.update!(store_owner: nil)
      end

      it "raises ApiError" do
        expect {
          described_class.new(store).call
        }.to raise_error(Discogs::Errors::ApiError, /OAuth authorization required/)
      end
    end

    context "with already processed order" do
      let(:orders_response) do
        {
          "orders" => [
            {
              "id" => "order-123",
              "status" => "New Order",
              "last_activity" => "2026-06-04T12:00:00Z",
              "items" => [ { "id" => 41578242 } ]
            }
          ]
        }
      end

      before do
        allow(client).to receive(:list_orders).and_return(orders_response)
        create(:listing, store: store, discogs_listing_id: "41578242")

        # Pre-process the order
        DiscogsOrderEvent.create!(
          store: store,
          discogs_order_id: "order-123",
          status: "New Order",
          last_activity_at: Time.parse("2026-06-04T12:00:00Z"),
          listing_ids: [ "41578242" ],
          removed_listing_count: 1,
          processed_at: Time.parse("2026-06-04T12:00:00Z")
        )
      end

      it "does not remove listings twice" do
        result = described_class.new(store).call

        expect(result[:removed_count]).to eq(0)
        expect(store.listings.where(discogs_listing_id: "41578242")).to be_present
      end
    end

    context "with same order having later activity" do
      let(:orders_response) do
        {
          "orders" => [
            {
              "id" => "order-123",
              "status" => "Shipped",
              "last_activity" => "2026-06-04T13:00:00Z",
              "items" => [ { "id" => 41578242 } ]
            }
          ]
        }
      end

      before do
        allow(client).to receive(:list_orders).and_return(orders_response)

        # Previous processing removed the listing
        DiscogsOrderEvent.create!(
          store: store,
          discogs_order_id: "order-123",
          status: "New Order",
          last_activity_at: Time.parse("2026-06-04T12:00:00Z"),
          listing_ids: [ "41578242" ],
          removed_listing_count: 1,
          processed_at: Time.parse("2026-06-04T12:00:00Z")
        )
      end

      it "updates event status but does not double-count removals" do
        result = described_class.new(store).call

        event = DiscogsOrderEvent.find_by(discogs_order_id: "order-123")
        expect(event.status).to eq("Shipped")
        expect(event.last_activity_at).to eq(Time.parse("2026-06-04T13:00:00Z"))
        expect(result[:removed_count]).to eq(0)
      end
    end

    context "when client raises error" do
      before do
        allow(client).to receive(:list_orders).and_raise(Discogs::Errors::ApiError.new("API failure"))
      end

      it "sets error fields and re-raises" do
        travel_to(Time.current) do
          expect {
            described_class.new(store).call
          }.to raise_error(Discogs::Errors::ApiError, /API failure/)

          expect(store.reload.last_sales_poll_error).to include("API failure")
          expect(store.reload.last_sales_poll_error_at).to be_within(1.second).of(Time.current)
        end
      end

      it "does not advance cursor" do
        original_cursor = store.sales_poll_cursor_at

        expect {
          described_class.new(store).call
        }.to raise_error(Discogs::Errors::ApiError)

        expect(store.reload.sales_poll_cursor_at).to eq(original_cursor)
      end

      it "does not mark last_sales_polled_at" do
        original_polled = store.last_sales_polled_at

        expect {
          described_class.new(store).call
        }.to raise_error(Discogs::Errors::ApiError)

        expect(store.reload.last_sales_polled_at).to eq(original_polled)
      end
    end

    context "with empty order list" do
      before do
        allow(client).to receive(:list_orders).and_return({ "orders" => [] })
      end

      it "still updates last_sales_polled_at" do
        travel_to(Time.current) do
          result = described_class.new(store).call

          expect(result[:order_count]).to eq(0)
          expect(result[:removed_count]).to eq(0)
          expect(result[:cursor_advanced]).to be false
          expect(store.reload.last_sales_polled_at).to be_within(1.second).of(Time.current)
        end
      end
    end

    context "with multiple orders" do
      let(:orders_response) do
        {
          "orders" => [
            {
              "id" => "order-1",
              "status" => "New Order",
              "last_activity" => "2026-06-04T12:00:00Z",
              "items" => [ { "id" => 111 } ]
            },
            {
              "id" => "order-2",
              "status" => "New Order",
              "last_activity" => "2026-06-04T13:00:00Z",
              "items" => [ { "id" => 222 } ]
            }
          ]
        }
      end

      before do
        allow(client).to receive(:list_orders).and_return(orders_response)
        create(:listing, store: store, discogs_listing_id: "111")
        create(:listing, store: store, discogs_listing_id: "222")
      end

      it "processes all orders and advances cursor to max activity" do
        result = described_class.new(store).call

        expect(result[:order_count]).to eq(2)
        expect(result[:removed_count]).to eq(2)
        expect(store.reload.sales_poll_cursor_at).to eq(Time.parse("2026-06-04T13:00:00Z"))
      end
    end
  end
end
