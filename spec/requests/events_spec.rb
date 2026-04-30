require "rails_helper"

RSpec.describe "Events", type: :request do
  let(:store) { create(:store, name: "Test Store", discogs_username: "test-store", sync_status: "idle") }
  let(:listing) { create(:listing, store:, genres: [], styles: []) }

  it "records a valid listing event" do
    expect do
      post "/events", params: {
        store_id: store.id,
        listing_id: listing.id,
        event_type: "record_view"
      }
    end.to change(ListingEvent, :count).by(1)

    expect(response).to have_http_status(:no_content)
  end

  it "rejects invalid event types" do
    expect do
      post "/events", params: {
        store_id: store.id,
        listing_id: listing.id,
        event_type: "unknown"
      }
    end.not_to change(ListingEvent, :count)

    expect(response).to have_http_status(:unprocessable_content)
  end
end
