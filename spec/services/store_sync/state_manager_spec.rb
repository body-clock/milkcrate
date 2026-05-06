require "rails_helper"

RSpec.describe StoreSync::StateManager do
  let(:store) { create(:store, sync_status: "idle") }

  describe ".start!" do
    it "sets sync_status to syncing" do
      described_class.start!(store)
      expect(store.reload.sync_status).to eq("syncing")
    end
  end

  describe ".succeed!" do
    before { store.update!(sync_status: "syncing", last_sync_error: "old error", last_sync_error_at: 1.day.ago) }

    it "sets sync_status to idle and clears errors" do
      described_class.succeed!(store)
      store.reload
      expect(store.sync_status).to eq("idle")
      expect(store.last_sync_error).to be_nil
      expect(store.last_sync_error_at).to be_nil
    end

    it "merges additional attributes" do
      described_class.succeed!(store, last_synced_at: Time.current, total_listings: 42)
      store.reload
      expect(store.last_synced_at).to be_present
      expect(store.total_listings).to eq(42)
    end
  end

  describe ".fail!" do
    let(:error) { StandardError.new("something broke").tap { |e| e.set_backtrace(["line 1", "line 2"]) } }

    it "sets sync_status to failed with error details" do
      described_class.fail!(store, error)
      store.reload
      expect(store.sync_status).to eq("failed")
      expect(store.last_sync_error).to include("StandardError: something broke")
      expect(store.last_sync_error).to include("line 1")
      expect(store.last_sync_error_at).to be_present
    end
  end
end
