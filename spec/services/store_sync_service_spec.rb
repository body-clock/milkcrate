require "rails_helper"

RSpec.describe StoreSyncService do
  let(:store) { create(:store, discogs_username: "teststore") }
  let(:client) { instance_double(DiscogsClient) }

  before do
    allow(DiscogsClient).to receive(:new).and_return(client)
  end

  def vinyl_listing(id: "123", format: "Vinyl")
    {
      "id" => id,
      "condition" => "VG+",
      "price" => { "value" => "12.50", "currency" => "USD" },
      "posted" => "2026-01-01T00:00:00-07:00",
      "release" => {
        "id" => "r#{id}",
        "format" => format,
        "formats" => [ { "name" => "Vinyl" } ],
        "basic_information" => {
          "artist" => "Miles Davis",
          "title" => "Kind of Blue",
          "genres" => [ "Jazz" ],
          "styles" => [ "Modal" ],
          "labels" => [ { "name" => "Columbia" } ]
        }
      }
    }
  end

  def api_page(listings:, pages: 1, current_page: 1)
    { "listings" => listings, "pagination" => { "pages" => pages, "page" => current_page } }
  end

  describe "#full_sync" do
    it "finishes in idle status and sets last_synced_at" do
      allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))

      described_class.new(store).full_sync

      store.reload
      expect(store.sync_status).to eq("idle")
      expect(store.last_synced_at).to be_present
    end

    it "imports vinyl listings into the database" do
      allow(client).to receive(:seller_inventory).and_return(
        api_page(listings: [ vinyl_listing(id: "1") ]),
        api_page(listings: [])
      )

      expect {
        described_class.new(store).full_sync
      }.to change { store.listings.count }.by(1)
    end

    it "skips non-vinyl listings" do
      cd = vinyl_listing(id: "999").tap do |l|
        l["release"]["formats"] = [ { "name" => "CD" } ]
        l["release"]["format"] = "CD"
      end
      allow(client).to receive(:seller_inventory).and_return(
        api_page(listings: [ cd ]),
        api_page(listings: [])
      )

      expect {
        described_class.new(store).full_sync
      }.not_to change { store.listings.count }
    end

    it "stops at max_pages" do
      allow(client).to receive(:seller_inventory).with("teststore", page: 1, sort_order: "desc").and_return(
        api_page(listings: [ vinyl_listing(id: "1") ], pages: 5)
      )

      described_class.new(store).full_sync(max_pages: 1)
      expect(client).to have_received(:seller_inventory).once
    end

    it "sets sync_status to failed and re-raises on unexpected errors" do
      allow(client).to receive(:seller_inventory).and_raise(RuntimeError, "network down")

      expect {
        described_class.new(store).full_sync
      }.to raise_error(RuntimeError, "network down")

      expect(store.reload.sync_status).to eq("failed")
    end

    it "handles Discogs 100-page limit gracefully" do
      allow(client).to receive(:seller_inventory).and_raise(
        DiscogsClient::ApiError, "Pagination above 100 pages is not supported"
      )

      expect {
        described_class.new(store).full_sync
      }.not_to raise_error

      expect(store.reload.sync_status).to eq("idle")
    end

    it "passes sort_order to the inventory client" do
      allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))
      StoreSyncService.new(store).full_sync(sort_order: "asc")
      expect(client).to have_received(:seller_inventory).with("teststore", page: 1, sort_order: "asc")
    end

    it "defaults sort_order to desc" do
      allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))
      StoreSyncService.new(store).full_sync
      expect(client).to have_received(:seller_inventory).with("teststore", page: 1, sort_order: "desc")
    end

    it "always manages sync status (sets idle on success)" do
      store.update!(sync_status: "syncing")
      allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))
      StoreSyncService.new(store).full_sync
      expect(store.reload.sync_status).to eq("idle")
    end
  end

end
