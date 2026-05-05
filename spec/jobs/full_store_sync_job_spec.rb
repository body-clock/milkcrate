require "rails_helper"

RSpec.describe FullStoreSyncJob do
  let(:store) { create(:store) }
  let(:sync_result) do
    instance_double(
      StoreSyncService::Result,
      listing_ids_for_enrichment: [ 11, 12 ],
      catalog_coverage: "partial",
      inventory_page_count: 101
    )
  end
  let(:sync_service) { instance_double(StoreSyncService, sync: sync_result) }

  before do
    allow(StoreSyncService).to receive(:new).with(store).and_return(sync_service)
  end

  describe "#perform" do
    it "runs the public sync flow" do
      described_class.new.perform(store.id)
      expect(sync_service).to have_received(:sync)
    end

    it "passes max_pages when provided" do
      described_class.new.perform(store.id, max_pages: 1)
      expect(sync_service).to have_received(:sync).with(max_pages: 1, manage_status: false)
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
  end
end
