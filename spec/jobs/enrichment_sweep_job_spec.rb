require "rails_helper"

RSpec.describe EnrichmentSweepJob do
  describe "#perform" do
    it "enqueues enrichment for stores that have never been enriched" do
      store = create(:store, enrichment_status: "idle", last_enriched_at: nil, last_synced_at: Time.current)

      described_class.perform_now

      expect(EnrichmentJob).to have_been_enqueued.with(store.id)
    end

    it "enqueues enrichment for stores synced since last enrichment" do
      store = create(:store, enrichment_status: "idle",
        last_enriched_at: 2.days.ago,
        last_synced_at: Time.current)

      described_class.perform_now

      expect(EnrichmentJob).to have_been_enqueued.with(store.id)
    end

    it "skips stores that are up to date (enriched after last sync)" do
      store = create(:store, enrichment_status: "idle",
        last_enriched_at: Time.current,
        last_synced_at: 2.hours.ago)

      described_class.perform_now

      expect(EnrichmentJob).not_to have_been_enqueued.with(store.id)
    end

    it "skips stores with failed enrichment status" do
      store = create(:store, enrichment_status: "failed", last_enriched_at: nil, last_synced_at: Time.current)

      described_class.perform_now

      expect(EnrichmentJob).not_to have_been_enqueued.with(store.id)
    end

    it "skips stores actively enriching" do
      store = create(:store, enrichment_status: "enriching", last_enriched_at: nil, last_synced_at: Time.current)

      described_class.perform_now

      expect(EnrichmentJob).not_to have_been_enqueued.with(store.id)
    end
  end
end
