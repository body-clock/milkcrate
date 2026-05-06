require "rails_helper"

RSpec.describe FullStoreSyncJob do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }
  let(:sync_result) do
    instance_double(
      StoreSyncService::Result,
      listing_ids_for_enrichment: [ 11, 12 ],
      catalog_coverage: "partial",
      inventory_page_count: 101
    )
  end
  let(:sync_service) { instance_double(StoreSyncService) }

  before do
    allow(StoreSyncService).to receive(:new).with(store).and_return(sync_service)
    # Simulate service managing sync status internally via StateManager.
    allow(sync_service).to receive(:sync) do |**|
      store.update!(sync_status: "idle", last_synced_at: Time.current)
      sync_result
    end
  end

  describe "#perform" do
    it "runs the public sync flow" do
      described_class.new.perform(store.id)
      expect(sync_service).to have_received(:sync)
    end

    it "passes max_pages when provided" do
      described_class.new.perform(store.id, max_pages: 1)
      expect(sync_service).to have_received(:sync).with(max_pages: 1)
    end

    it "sets sync_status to syncing then idle" do
      described_class.new.perform(store.id)
      store.reload
      expect(store.sync_status).to eq("idle")
      expect(store.last_sync_error).to be_nil
    end

    it "enqueues EnrichReleasesJob after sync" do
      expect {
        described_class.new.perform(store.id)
      }.to have_enqueued_job(EnrichReleasesJob).with(store.id, listing_ids: [ 11, 12 ])
    end

    it "enqueues DailyCurationJob after sync" do
      expect {
        described_class.new.perform(store.id)
      }.to have_enqueued_job(DailyCurationJob).with(store.id)
    end

    it "persists failure details when sync crashes" do
      allow(sync_service).to receive(:sync).and_raise(RuntimeError, "discogs timeout")

      expect {
        described_class.new.perform(store.id)
      }.to raise_error(RuntimeError, "discogs timeout")

      store.reload
      expect(store.sync_status).to eq("failed")
      expect(store.last_sync_error).to include("RuntimeError: discogs timeout")
      expect(store.last_sync_error_at).to be_present
    end

    it "uses sync start time as the availability watermark" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        allow(sync_service).to receive(:sync) do
          create(:listing, store:, format: "LP", last_seen_at: 2.seconds.from_now)
          travel 5.seconds
          sync_result
        end

        described_class.new.perform(store.id)

        store.reload
        expect(store.last_synced_at).to eq(Time.zone.parse("2026-05-05 12:00:00"))
        expect(store.listings.available.count).to eq(1)
      end
    end
  end
end
