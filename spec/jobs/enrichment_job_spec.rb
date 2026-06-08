require "rails_helper"

RSpec.describe EnrichmentJob do
  let(:store) { create(:store) }

  describe "#perform" do
    let(:service) { instance_double(EnrichmentService) }

    before do
      allow(EnrichmentService).to receive(:new).and_return(service)
    end

    it "calls the enrichment orchestration entry point" do
      expect(service).to receive(:enrich_store).with(store, listing_ids: [ 1, 2 ])

      described_class.perform_now(store.id, listing_ids: [ 1, 2 ])
    end

    it "passes listing_ids as nil when not provided" do
      expect(service).to receive(:enrich_store).with(store, listing_ids: nil)

      described_class.perform_now(store.id)
    end

    it "enqueues DailyCurationJob after successful enrichment" do
      allow(service).to receive(:enrich_store).with(store, listing_ids: nil)

      expect {
        described_class.perform_now(store.id)
      }.to have_enqueued_job(DailyCurationJob).with(store.id)
    end

    it "logs the loaded store username when enrichment fails" do
      allow(Rails.logger).to receive(:error)
      allow(service).to receive(:enrich_store).with(store, listing_ids: nil)
        .and_raise(RuntimeError, "Discogs unavailable")

      expect {
        described_class.perform_now(store.id)
      }.to raise_error(RuntimeError, "Discogs unavailable")

      expect(Rails.logger).to have_received(:error)
        .with(include("store=#{store.discogs_username}"))
    end
  end
end
