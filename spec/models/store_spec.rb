require "rails_helper"

RSpec.describe Store, type: :model do
  describe "normalize_discogs_username" do
    it "downcases discogs_username before validation" do
      store = build(:store, discogs_username: "MyUserName")
      store.validate
      expect(store.discogs_username).to eq("myusername")
    end

    it "preserves already lowercase discogs_username" do
      store = build(:store, discogs_username: "already-lower")
      store.validate
      expect(store.discogs_username).to eq("already-lower")
    end

    it "handles nil discogs_username without error" do
      store = build(:store, discogs_username: nil)
      expect { store.validate }.not_to raise_error
    end

    it "prevents casing-variant duplicates" do
      create(:store, discogs_username: "mystore")
      dup = build(:store, discogs_username: "MyStore")
      expect(dup).not_to be_valid
      expect(dup.errors[:discogs_username]).to include("has already been taken")
    end
  end

  describe ".with_discogs_username" do
    let!(:store) { create(:store, discogs_username: "teststore") }

    it "finds store by exact username" do
      expect(Store.with_discogs_username("teststore").first).to eq(store)
    end

    it "finds store by uppercase username" do
      expect(Store.with_discogs_username("TESTSTORE").first).to eq(store)
    end

    it "finds store by mixed-case username" do
      expect(Store.with_discogs_username("TestStore").first).to eq(store)
    end

    it "returns empty relation for non-existent username" do
      expect(Store.with_discogs_username("nonexistent").first).to be_nil
    end

    it "returns empty relation when no stores exist" do
      store.destroy!
      expect(Store.with_discogs_username("anything").first).to be_nil
    end
  end

  describe "#discogs_user_id" do
    it "stores a valid Discogs profile ID" do
      store = create(:store, discogs_user_id: 1_234_567)
      expect(store.reload.discogs_user_id).to eq(1_234_567)
    end

    it "allows nil discogs_user_id for legacy stores" do
      store = create(:store, discogs_user_id: nil)
      expect(store.discogs_user_id).to be_nil
    end

    it "prevents duplicate populated discogs_user_id values" do
      create(:store, discogs_user_id: 999_999)
      dup = build(:store, discogs_user_id: 999_999)
      expect {
        dup.save!(validate: false)
      }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "allows multiple nil discogs_user_id values" do
      create(:store, discogs_user_id: nil)
      dup = build(:store, discogs_user_id: nil)
      expect(dup).to be_valid
    end

    # bigint columns coerce values; type safety is handled by the database adapter

    it "does not restrict or validate discogs_user_id as required during creation" do
      store = create(:store, discogs_user_id: nil)
      expect(store).to be_persisted
    end
  end

  describe "StoreSync::StatusManager" do
    it "marks sync success with supplied metadata" do
      store = create(:store, sync_status: "failed", last_sync_error: "boom", last_sync_error_at: 1.hour.ago)
      synced_at = Time.zone.parse("2026-05-05 12:00:00")

      StoreSync::StatusManager.new(store).mark_succeeded!(
        last_synced_at: synced_at, catalog_coverage: "partial", inventory_page_count: 101
      )

      expect(store.reload).to have_attributes(
        sync_status: "idle",
        last_sync_error: nil,
        last_sync_error_at: nil,
        last_synced_at: synced_at,
        catalog_coverage: "partial",
        inventory_page_count: 101
      )
    end

    it "marks sync failure with summarized error details" do
      store = create(:store)
      error = RuntimeError.new("discogs timeout")

      StoreSync::StatusManager.new(store).mark_failed!(error)

      expect(store.reload.sync_status).to eq("failed")
      expect(store.last_sync_error).to include("RuntimeError: discogs timeout")
      expect(store.last_sync_error_at).to be_present
    end

    it "is stale when never synced" do
      store = create(:store, last_synced_at: nil)
      expect(StoreSync::StatusManager.new(store).stale?).to be(true)
    end

    it "is stale when last synced beyond threshold" do
      store = create(:store, last_synced_at: 24.hours.ago)
      expect(StoreSync::StatusManager.new(store).stale?).to be(true)
    end

    it "is not stale when recently synced" do
      store = create(:store, last_synced_at: 1.hour.ago)
      expect(StoreSync::StatusManager.new(store).stale?).to be(false)
    end
  end

  describe "StoreEnrichment::StatusManager" do
    it "marks enrichment as started" do
      store = create(:store)

      StoreEnrichment::StatusManager.new(store).mark_started!

      expect(store.reload.enrichment_status).to eq("enriching")
    end

    it "marks enrichment as succeeded" do
      store = create(:store, enrichment_status: "enriching", last_enriched_at: nil)
      finished_at = Time.zone.parse("2026-05-05 12:00:00")

      StoreEnrichment::StatusManager.new(store).mark_succeeded!(finished_at:)

      expect(store.reload.enrichment_status).to eq("idle")
      expect(store.last_enriched_at).to eq(finished_at)
    end

    it "marks enrichment as failed" do
      store = create(:store, enrichment_status: "enriching")

      StoreEnrichment::StatusManager.new(store).mark_failed!

      expect(store.reload.enrichment_status).to eq("failed")
    end
  end

  describe "#sync_strategy" do
    it "returns CsvExport for OAuth store on first sync (no listing count yet)" do
      owner = create(:store_owner)
      store = create(:store, store_owner: owner, total_listings: nil)

      expect(store.sync_strategy).to be_a(SyncStrategies::CsvExport)
    end

    it "returns PublicApi for OAuth store with <= 10k listings" do
      owner = create(:store_owner)
      store = create(:store, store_owner: owner, total_listings: 5_000)

      expect(store.sync_strategy).to be_a(SyncStrategies::PublicApi)
    end

    it "returns CsvExport for OAuth store with > 10k listings" do
      owner = create(:store_owner)
      store = create(:store, store_owner: owner, total_listings: 15_000)

      expect(store.sync_strategy).to be_a(SyncStrategies::CsvExport)
    end

    it "returns PublicApi when store has no store_owner" do
      store = create(:store, store_owner: nil)

      expect(store.sync_strategy).to be_a(SyncStrategies::PublicApi)
    end

    it "returns PublicApi when store_owner exists but is not authorized" do
      owner = create(:store_owner, discogs_oauth_token: nil, discogs_oauth_token_secret: nil, oauth_authorized_at: nil)
      store = create(:store, store_owner: owner)

      expect(store.sync_strategy).to be_a(SyncStrategies::PublicApi)
    end
  end

  describe "sales polling fields" do
    it "defaults inventory_version to 0" do
      store = create(:store)
      expect(store.inventory_version).to eq(0)
    end

    it "defaults sales_poll_cursor_at to nil" do
      store = create(:store)
      expect(store.sales_poll_cursor_at).to be_nil
    end

    it "defaults last_sales_polled_at to nil" do
      store = create(:store)
      expect(store.last_sales_polled_at).to be_nil
    end
  end

  describe "#increment_inventory_version!" do
    it "increments inventory_version by 1" do
      store = create(:store, inventory_version: 3)
      store.increment_inventory_version!
      expect(store.inventory_version).to eq(4)
    end

    it "increments from default 0 to 1" do
      store = create(:store)
      store.increment_inventory_version!
      expect(store.inventory_version).to eq(1)
    end

    it "increments atomically using update_counters" do
      store = create(:store, inventory_version: 5)
      store.increment_inventory_version!
      expect(store.reload.inventory_version).to eq(6)
    end
  end

  describe "associations" do
    it "has many discogs_order_events" do
      store = create(:store)
      event = create(:discogs_order_event, store: store)
      expect(store.discogs_order_events).to include(event)
    end

    it "destroys associated discogs_order_events when destroyed" do
      store = create(:store)
      create(:discogs_order_event, store: store)
      expect { store.destroy }.to change(DiscogsOrderEvent, :count).by(-1)
    end
  end
end
