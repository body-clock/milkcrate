require "rails_helper"

RSpec.describe "ClickEvents", type: :request do
  describe "POST /click" do
    let!(:store) { create(:store, discogs_username: "teststore") }

    it "creates a click event with store_slug" do
      expect {
        post "/click", params: { store_slug: "teststore", listing_id: nil }
      }.to change(ClickEvent, :count).by(1)

      expect(response).to have_http_status(:no_content)

      event = ClickEvent.last
      expect(event.store).to eq(store)
      expect(event.referrer).to be_nil
    end

    it "associates listing when listing_id is provided" do
      listing = create(:listing, store: store)

      post "/click", params: { store_slug: "teststore", listing_id: listing.id.to_s }

      event = ClickEvent.last
      expect(event.listing).to eq(listing)
    end

    it "returns no_content for unknown store_slug" do
      expect {
        post "/click", params: { store_slug: "nonexistent", listing_id: nil }
      }.not_to change(ClickEvent, :count)

      expect(response).to have_http_status(:no_content)
    end

    it "captures referrer and user agent" do
      post "/click",
        params: { store_slug: "teststore", listing_id: nil },
        headers: { "HTTP_REFERER" => "https://milkcrate.fm/teststore",
                   "HTTP_USER_AGENT" => "TestBot/1.0" }

      event = ClickEvent.last
      expect(event.referrer).to eq("https://milkcrate.fm/teststore")
      expect(event.user_agent).to eq("TestBot/1.0")
    end
  end
end
