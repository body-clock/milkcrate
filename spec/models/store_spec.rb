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

  describe "storefront snapshots" do
    let(:store) { create(:store) }
    let(:generated_at) { Time.zone.parse("2026-05-17 09:00:00") }

    def snapshot_attrs(overrides = {})
      {
        curation_date: Date.current,
        status: "ready",
        active: true,
        props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
        crates: [
          {
            "slug" => "picks",
            "name" => "Milkcrate Picks",
            "count" => 1,
            "records" => []
          }
        ],
        storefront_sections: [
          {
            "key" => "picks_wall",
            "crate" => {
              "slug" => "picks",
              "name" => "Milkcrate Picks",
              "count" => 1,
              "records" => []
            }
          }
        ],
        surfaced_listing_ids: [],
        generated_at: generated_at,
        metrics: {}
      }.merge(overrides)
    end

    it "has many storefront snapshots" do
      snapshot = store.storefront_snapshots.create!(snapshot_attrs)

      expect(store.storefront_snapshots).to include(snapshot)
    end

    it "returns the active compatible storefront snapshot" do
      current = store.storefront_snapshots.create!(snapshot_attrs)
      store.storefront_snapshots.create!(snapshot_attrs(active: false, props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION - 1))

      expect(store.active_storefront_snapshot).to eq(current)
    end
  end

  describe "sync lifecycle" do
    it "marks sync success with supplied metadata" do
      store = create(:store, sync_status: "failed", last_sync_error: "boom", last_sync_error_at: 1.hour.ago)
      synced_at = Time.zone.parse("2026-05-05 12:00:00")

      store.mark_sync_succeeded!(last_synced_at: synced_at, catalog_coverage: "partial", inventory_page_count: 101)

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

      store.mark_sync_failed!(error)

      expect(store.reload.sync_status).to eq("failed")
      expect(store.last_sync_error).to include("RuntimeError: discogs timeout")
      expect(store.last_sync_error_at).to be_present
    end
  end

  describe "enrichment lifecycle" do
    it "marks enrichment as started" do
      store = create(:store)

      store.mark_enrichment_started!

      expect(store.reload.enrichment_status).to eq("enriching")
    end

    it "marks enrichment as succeeded" do
      store = create(:store, enrichment_status: "enriching", last_enriched_at: nil)
      finished_at = Time.zone.parse("2026-05-05 12:00:00")

      store.mark_enrichment_succeeded!(finished_at:)

      expect(store.reload.enrichment_status).to eq("idle")
      expect(store.last_enriched_at).to eq(finished_at)
    end

    it "marks enrichment as failed" do
      store = create(:store, enrichment_status: "enriching")

      store.mark_enrichment_failed!

      expect(store.reload.enrichment_status).to eq("failed")
    end
  end
end
