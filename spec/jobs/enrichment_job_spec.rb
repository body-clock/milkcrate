require "rails_helper"

RSpec.describe EnrichmentJob do
  let(:store) { create(:store) }

  describe "#perform" do
    it "calls both enrichment methods on EnrichmentService" do
      service = instance_double(EnrichmentService)
      allow(EnrichmentService).to receive(:new).and_return(service)
      expect(service).to receive(:enrich_releases).with(store, listing_ids: [ 1, 2 ])
      expect(service).to receive(:enrich_music_brainz_images).with(store)

      described_class.new.perform(store.id, listing_ids: [ 1, 2 ])
    end

    it "passes listing_ids as nil when not provided" do
      service = instance_double(EnrichmentService)
      allow(EnrichmentService).to receive(:new).and_return(service)
      expect(service).to receive(:enrich_releases).with(store, listing_ids: nil)
      expect(service).to receive(:enrich_music_brainz_images).with(store)

      described_class.new.perform(store.id)
    end
  end
end
