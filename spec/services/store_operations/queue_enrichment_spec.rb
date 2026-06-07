require "rails_helper"

RSpec.describe StoreOperations::QueueEnrichment do
  describe ".call" do
    subject(:result) { described_class.call(store) }

    let(:store) { create(:store, enrichment_status: :idle, enrichment_progress_pct: nil) }

    context "when store is idle" do
      it "returns queued outcome" do
        expect(result.outcome).to eq(:queued)
      end

      it "claims enriching status" do
        expect { result }.to change { store.reload.enrichment_status }.from("idle").to("enriching")
      end

      it "zeroes enrichment progress" do
        store.update!(enrichment_progress_pct: 30)
        expect { result }.to change { store.reload.enrichment_progress_pct }.from(30).to(0)
      end

      it "enqueues EnrichmentJob with no listing IDs" do
        expect { result }.to have_enqueued_job(EnrichmentJob).with(store.id, listing_ids: nil)
      end
    end

    context "when store is already enriching" do
      before { store.update!(enrichment_status: :enriching) }

      it "returns blocked outcome" do
        expect(result.outcome).to eq(:blocked)
      end

      it "does not change enrichment_status" do
        expect { result }.not_to change { store.reload.enrichment_status }
      end

      it "does not enqueue another job" do
        expect { result }.not_to have_enqueued_job(EnrichmentJob)
      end
    end

    context "when store is in failed status (retry allowed)" do
      before do
        store.update!(
          enrichment_status: :failed,
          enrichment_progress_pct: nil,
          last_enriched_at: 2.days.ago
        )
      end

      it "returns queued outcome" do
        expect(result.outcome).to eq(:queued)
      end

      it "claims enriching status" do
        expect { result }.to change { store.reload.enrichment_status }.from("failed").to("enriching")
      end

      it "does not reset enrichment timestamps" do
        expect { result }.not_to change { store.reload.last_enriched_at }
      end

      it "enqueues EnrichmentJob" do
        expect { result }.to have_enqueued_job(EnrichmentJob).with(store.id, listing_ids: nil)
      end
    end

    context "when enqueue raises an exception" do
      before do
        allow(EnrichmentJob).to receive(:perform_later).and_raise(StandardError.new("Queue full"))
      end

      it "restores prior enrichment_status" do
        expect { result }.not_to change { store.reload.enrichment_status }
      end

      it "restores prior enrichment_progress_pct" do
        store.update!(enrichment_progress_pct: 75)
        result
        expect(store.reload.enrichment_progress_pct).to eq(75)
      end

      it "returns enqueue_failed outcome" do
        expect(result.outcome).to eq(:enqueue_failed)
      end
    end

    context "when enqueue returns false" do
      before do
        allow(EnrichmentJob).to receive(:perform_later).and_return(nil)
      end

      it "restores prior enrichment_status" do
        expect { result }.not_to change { store.reload.enrichment_status }
      end

      it "restores prior enrichment_progress_pct" do
        store.update!(enrichment_progress_pct: 75)
        result
        expect(store.reload.enrichment_progress_pct).to eq(75)
      end

      it "returns enqueue_failed outcome" do
        expect(result.outcome).to eq(:enqueue_failed)
      end
    end

    context "when store is deleted before claim" do
      it "returns missing outcome" do
        Store.where(id: store.id).delete_all
        expect(result.outcome).to eq(:missing)
      end
    end

    context "with concurrent requests (serialized via row lock)" do
      it "allows only one enqueue when two requests race" do
        result1 = described_class.call(store)
        expect(result1.outcome).to eq(:queued)

        store.reload
        result2 = described_class.call(store)
        expect(result2.outcome).to eq(:blocked)
      end
    end
  end
end
