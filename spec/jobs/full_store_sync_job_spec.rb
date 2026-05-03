require "rails_helper"

RSpec.describe FullStoreSyncJob do
  let(:store) { create(:store) }
  let(:sync_service) { instance_double(StoreSyncService, full_sync: 42) }

  before do
    allow(StoreSyncService).to receive(:new).with(store).and_return(sync_service)
  end

  describe "#perform" do
    it "calls StoreSyncService#full_sync" do
      described_class.new.perform(store.id)
      expect(sync_service).to have_received(:full_sync).with(max_pages: nil)
    end

    it "passes max_pages when provided" do
      described_class.new.perform(store.id, max_pages: 2)
      expect(sync_service).to have_received(:full_sync).with(max_pages: 2)
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
