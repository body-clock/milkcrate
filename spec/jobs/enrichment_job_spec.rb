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

      described_class.new.perform(store.id, listing_ids: [ 1, 2 ])
    end

    it "passes listing_ids as nil when not provided" do
      expect(service).to receive(:enrich_store).with(store, listing_ids: nil)

      described_class.new.perform(store.id)
    end
  end
end
