# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Sales poll integration", :integration do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store, total_listings: 2) }
  let(:store_owner) { create(:store_owner) }
  let(:client) { instance_double(DiscogsClient) }

  let(:orders_response) do
    {
      "orders" => [
        {
          "id" => "41578242-1",
          "status" => "New Order",
          "last_activity" => "2026-06-04T12:00:00Z",
          "items" => [ { "id" => 41578242 } ]
        }
      ]
    }
  end

  before do
    store.update!(store_owner: store_owner)
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:list_orders).and_return(orders_response)
  end

  it "removes sold listings and enqueues curation through the full pipeline" do
    create(:listing, store: store, discogs_listing_id: "41578242")
    create(:listing, store: store, discogs_listing_id: "keep-me")

    travel_to(Time.zone.parse("2026-06-04T12:01:00")) do
      expect {
        SalesPollStoreJob.perform_now(store.id)
      }.to change(DiscogsOrderEvent, :count).by(1)
       .and change { store.listings.count }.by(-1)
       .and have_enqueued_job(DailyCurationJob).with(store.id)
    end

    # Sold listing is gone, unsold listing remains
    expect(store.listings.find_by(discogs_listing_id: "41578242")).to be_nil
    expect(store.listings.find_by(discogs_listing_id: "keep-me")).to be_present

    # Order event recorded with correct metadata
    event = DiscogsOrderEvent.last
    expect(event.store).to eq(store)
    expect(event.discogs_order_id).to eq("41578242-1")
    expect(event.status).to eq("New Order")
    expect(event.listing_ids).to eq([ "41578242" ])
    expect(event.removed_listing_count).to eq(1)

    # Poll state advanced
    expect(store.reload.last_sales_polled_at).to be_within(1.second).of(Time.zone.parse("2026-06-04T12:01:00"))
    expect(store.sales_poll_cursor_at).to eq(Time.zone.parse("2026-06-04T12:00:00Z"))
    expect(store.last_sales_poll_error).to be_nil

    # Inventory version bumped for cache invalidation
    expect(store.inventory_version).to eq(1)
  end

  it "stores poll error state without advancing cursor when API fails" do
    allow(client).to receive(:list_orders).and_raise(Discogs::Errors::ApiError.new("API down"))

    expect {
      SalesPollStoreJob.perform_now(store.id)
    }.to raise_error(Discogs::Errors::ApiError, /API down/)

    expect(store.reload.last_sales_poll_error).to include("API down")
    expect(store.last_sales_poll_error_at).to be_present
    expect(store.sales_poll_cursor_at).to be_nil
    expect(store.last_sales_polled_at).to be_nil
  end

  it "does not enqueue curation when no listings were found" do
    create(:listing, store: store, discogs_listing_id: "keep-me")

    travel_to(Time.zone.parse("2026-06-04T12:01:00")) do
      expect {
        SalesPollStoreJob.perform_now(store.id)
      }.not_to have_enqueued_job(DailyCurationJob)
    end

    # Listing untouched — no matching ID in the order
    expect(store.listings.find_by(discogs_listing_id: "keep-me")).to be_present
  end
end
