require "rails_helper"

RSpec.describe FullStoreSyncJob do
  let(:store) { create(:store) }
  let(:sync_service) { instance_double(StoreSyncService, full_sync: 42) }

  before do
    allow(StoreSyncService).to receive(:new).with(store).and_return(sync_service)
  end

  describe "#perform" do
    it "calls full_sync twice — desc then asc" do
      described_class.new.perform(store.id)
      expect(sync_service).to have_received(:full_sync).with(hash_including(sort_order: "desc")).ordered
      expect(sync_service).to have_received(:full_sync).with(hash_including(sort_order: "asc")).ordered
    end

    it "passes max_pages to both passes when provided" do
      described_class.new.perform(store.id, max_pages: 1)
      expect(sync_service).to have_received(:full_sync).with(max_pages: 1, sort_order: "desc")
      expect(sync_service).to have_received(:full_sync).with(max_pages: 1, sort_order: "asc")
    end

    it "enqueues EnrichReleasesJob after sync" do
      expect {
        described_class.new.perform(store.id)
      }.to have_enqueued_job(EnrichReleasesJob).with(store.id)
    end

    it "enqueues DailyCurationJob after sync" do
      expect {
        described_class.new.perform(store.id)
      }.to have_enqueued_job(DailyCurationJob).with(store.id)
    end
  end
end
