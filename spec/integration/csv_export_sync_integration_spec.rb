require "rails_helper"

RSpec.describe "CSV export sync pipeline", type: :request do
  let(:store) { create(:store, :oauth_authorized, discogs_username: "teststore") }
  let(:discogs_client) { instance_double(DiscogsClient) }

  # A realistic Discogs CSV export
  let(:sample_csv) do
    <<~CSV
      listing_id,release_id,artist,title,label,catno,format,media_condition,price,listed,comments,status
      1001,2001,Miles Davis,Kind of Blue,Columbia,CL1355,Vinyl,Very Good Plus (VG+),25.00,2026-01-15 10:00:00 UTC,,For Sale
      1002,2002,John Coltrane,A Love Supreme,Impulse!,AS-77,Vinyl,Mint (M),40.00,2026-01-20 14:30:00 UTC,Original press,For Sale
      1003,2003,Thelonious Monk,Brilliant Corners,Riverside,RLP-226,Vinyl,Very Good (VG),15.00,2026-02-01 09:00:00 UTC,,For Sale
      1004,2004,Bill Evans,Sunday at the Village Vanguard,Riverside,RLP-9376,Vinyl,Very Good Plus (VG+),30.00,2026-03-10 16:00:00 UTC,Includes original insert,For Sale
    CSV
  end

  describe "full sync from export to listings" do
    before do
      allow(discogs_client).to receive(:inventory_export).and_return({ "id" => 42 })
      allow(discogs_client).to receive(:check_export_status).with(42).and_return({ "status" => "completed" })
      allow(discogs_client).to receive(:download_export).with(42).and_return(sample_csv)
      allow(DiscogsClient).to receive(:new).and_return(discogs_client)
    end

    it "creates listings from the CSV export" do
      expect {
        FullStoreSyncJob.perform_now(store.id)
      }.to change(store.listings, :count).from(0).to(4)

      listing = store.listings.find_by!(discogs_listing_id: "1001")
      expect(listing.artist).to eq("Miles Davis")
      expect(listing.title).to eq("Kind of Blue")
      expect(listing.price).to eq(25.00)
      expect(listing.format).to eq("Vinyl")
    end

    it "updates store metadata after sync" do
      FullStoreSyncJob.perform_now(store.id)

      store.reload
      expect(store.total_listings).to eq(4)
      expect(store.last_synced_at).to be_present
      expect(store.sync_status).to eq("idle")
    end

    it "is idempotent — re-syncing doesn't duplicate listings" do
      FullStoreSyncJob.perform_now(store.id)
      expect {
        FullStoreSyncJob.perform_now(store.id)
      }.not_to change(store.listings, :count)
    end

    it "updates changed prices on re-sync" do
      FullStoreSyncJob.perform_now(store.id)

      listing = store.listings.find_by!(discogs_listing_id: "1001")
      listing.update!(price: 0.01)

      FullStoreSyncJob.perform_now(store.id)

      listing.reload
      expect(listing.price).to eq(25.00)
    end
  end

  describe "FullStoreSyncJob integration" do
    before do
      allow(discogs_client).to receive(:inventory_export).and_return({ "id" => 42 })
      allow(discogs_client).to receive(:check_export_status).with(42).and_return({ "status" => "completed" })
      allow(discogs_client).to receive(:download_export).with(42).and_return(sample_csv)
      allow(DiscogsClient).to receive(:new).and_return(discogs_client)
    end

    it "runs the full job without error" do
      expect {
        FullStoreSyncJob.perform_now(store.id)
      }.to change(store.listings, :count).by(4)
    end
  end

  describe "dashboard after sync" do
    before do
      allow(discogs_client).to receive(:inventory_export).and_return({ "id" => 42 })
      allow(discogs_client).to receive(:check_export_status).with(42).and_return({ "status" => "completed" })
      allow(discogs_client).to receive(:download_export).with(42).and_return(sample_csv)
      allow(DiscogsClient).to receive(:new).and_return(discogs_client)

      FullStoreSyncJob.perform_now(store.id)
    end

    it "shows the synced listing count" do
      allow_any_instance_of(DashboardController).to receive(:session).and_return(
        ActiveSupport::HashWithIndifferentAccess.new(store_owner_id: store.store_owner_id)
      )

      get "/dashboard"

      expect(response.body).to include("4")
      expect(response.body).to include("teststore")
    end
  end

  describe "error handling" do
    context "when Discogs export fails" do
      before do
        allow(discogs_client).to receive(:inventory_export).and_raise(DiscogsClient::ApiError, "Export failed")
        allow(DiscogsClient).to receive(:new).and_return(discogs_client)
      end

      it "marks the store as failed" do
        expect {
          FullStoreSyncJob.perform_now(store.id)
        }.to raise_error(DiscogsClient::ApiError)

        store.reload
        expect(store.sync_status).to eq("failed")
        expect(store.last_sync_error).to be_present
      end
    end

    context "when CSV is malformed" do
      before do
        allow(discogs_client).to receive(:inventory_export).and_return({ "id" => 42 })
        allow(discogs_client).to receive(:check_export_status).with(42).and_return({ "status" => "completed" })
        allow(discogs_client).to receive(:download_export).with(42).and_return("listing_id,title\n\"unclosed\n")
        allow(DiscogsClient).to receive(:new).and_return(discogs_client)
      end

      it "marks the store as failed" do
        expect {
          FullStoreSyncJob.perform_now(store.id)
        }.to raise_error(CsvExportSync::ParseError)

        store.reload
        expect(store.sync_status).to eq("failed")
      end
    end
  end
end
