require "rails_helper"

RSpec.describe EnrichmentJob do
  let(:store) { create(:store) }

  describe "#perform" do
    let(:service) { instance_double(EnrichmentService) }

    before do
      allow(EnrichmentService).to receive(:new).and_return(service)
    end

    it "calls both enrichment methods on EnrichmentService" do
      allow(service).to receive(:enrich_releases)
      allow(service).to receive(:enrich_music_brainz_images)
      expect(service).to receive(:enrich_releases).with(store, listing_ids: [ 1, 2 ])
      expect(service).to receive(:enrich_music_brainz_images).with(store)

      described_class.new.perform(store.id, listing_ids: [ 1, 2 ])
    end

    it "passes listing_ids as nil when not provided" do
      allow(service).to receive(:enrich_releases)
      allow(service).to receive(:enrich_music_brainz_images)
      expect(service).to receive(:enrich_releases).with(store, listing_ids: nil)
      expect(service).to receive(:enrich_music_brainz_images).with(store)

      described_class.new.perform(store.id)
    end

    describe "enrichment status transitions" do
      before do
        allow(service).to receive(:enrich_releases)
        allow(service).to receive(:enrich_music_brainz_images)
        # Make the job use our store instance so we can verify update! calls
        allow(Store).to receive(:find).with(store.id).and_return(store)
      end

      it "sets enrichment_status to enriching at start" do
        expect(store).to receive(:update!).with(hash_including(enrichment_status: "enriching")).ordered
        expect(store).to receive(:update!).with(hash_including(enrichment_status: "idle", last_enriched_at: instance_of(ActiveSupport::TimeWithZone))).ordered

        described_class.new.perform(store.id)
      end

      it "sets last_enriched_at on successful completion" do
        allow(store).to receive(:update!).and_call_original

        described_class.new.perform(store.id)

        expect(store.reload.last_enriched_at).to be_within(1.second).of(Time.current)
      end

      it "stays idle when enrichment completes despite individual API errors in EnrichmentService" do
        allow(store).to receive(:update!).and_call_original

        described_class.new.perform(store.id)

        expect(store.reload.enrichment_status).to eq("idle")
      end

      it "sets enrichment_status to failed and re-raises on hard failure" do
        allow(service).to receive(:enrich_releases).and_raise(StandardError.new("boom"))
        allow(store).to receive(:update!).and_call_original

        expect {
          described_class.new.perform(store.id)
        }.to raise_error(StandardError, "boom")

        expect(store.reload.enrichment_status).to eq("failed")
      end
    end
  end
end
