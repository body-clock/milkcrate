require "rails_helper"

RSpec.describe StoreOperations::QueueSync do
  describe ".call" do
    subject(:result) { described_class.call(store) }

    let(:store) { create(:store, sync_status: :idle, sync_progress_pct: nil) }

    context "when store is idle" do
      it "returns queued outcome" do
        expect(result.outcome).to eq(:queued)
      end

      it "claims syncing status" do
        expect { result }.to change { store.reload.sync_status }.from("idle").to("syncing")
      end

      it "zeroes sync progress" do
        store.update!(sync_progress_pct: 50)
        expect { result }.to change { store.reload.sync_progress_pct }.from(50).to(0)
      end

      it "enqueues FullStoreSyncJob" do
        expect { result }.to have_enqueued_job(FullStoreSyncJob).with(store.id)
      end
    end

    context "when store is already syncing" do
      before { store.update!(sync_status: :syncing) }

      it "returns blocked outcome" do
        expect(result.outcome).to eq(:blocked)
      end

      it "does not change sync_status" do
        expect { result }.not_to change { store.reload.sync_status }
      end

      it "does not enqueue another job" do
        expect { result }.not_to have_enqueued_job(FullStoreSyncJob)
      end
    end

    context "when store is in failed status (retry allowed)" do
      before do
        store.update!(
          sync_status: :failed,
          sync_progress_pct: nil,
          last_sync_error: "RuntimeError: time out",
          last_sync_error_at: 1.hour.ago
        )
      end

      it "returns queued outcome" do
        expect(result.outcome).to eq(:queued)
      end

      it "claims syncing status" do
        expect { result }.to change { store.reload.sync_status }.from("failed").to("syncing")
      end

      it "preserves previous error metadata until worker updates lifecycle" do
        expect { result }.not_to change { store.reload.last_sync_error }
        expect { result }.not_to change { store.reload.last_sync_error_at }
      end

      it "enqueues FullStoreSyncJob" do
        expect { result }.to have_enqueued_job(FullStoreSyncJob).with(store.id)
      end
    end

    context "when enqueue raises an exception" do
      let(:error) { StandardError.new("Queue full") }

      before do
        allow(FullStoreSyncJob).to receive(:perform_later).and_raise(error)
      end

      it "restores prior sync_status" do
        expect { result }.not_to change { store.reload.sync_status }
      end

      it "restores prior sync_progress_pct" do
        store.update!(sync_progress_pct: 42)
        result
        expect(store.reload.sync_progress_pct).to eq(42)
      end

      it "returns enqueue_failed outcome" do
        expect(result.outcome).to eq(:enqueue_failed)
      end

      it "does not enqueue the job" do
        # perform_later was called but raised; the job should not be in the queue
        result
        expect(FullStoreSyncJob).to have_received(:perform_later).once
      end
    end

    context "when enqueue returns false" do
      before do
        allow(FullStoreSyncJob).to receive(:perform_later).and_return(nil)
      end

      it "restores prior sync_status" do
        expect { result }.not_to change { store.reload.sync_status }
      end

      it "restores prior sync_progress_pct" do
        store.update!(sync_progress_pct: 42)
        result
        expect(store.reload.sync_progress_pct).to eq(42)
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
        # Simulate serialized access: first call succeeds, second sees syncing
        result1 = described_class.call(store)
        expect(result1.outcome).to eq(:queued)

        store.reload
        result2 = described_class.call(store)
        expect(result2.outcome).to eq(:blocked)
      end
    end
  end
end
