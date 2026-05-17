require "rails_helper"

RSpec.describe StorefrontSnapshot, type: :model do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }
  let(:schema_version) { described_class::CURRENT_PROPS_SCHEMA_VERSION }
  let(:generated_at) { Time.zone.parse("2026-05-17 09:00:00") }

  def ready_attrs(overrides = {})
    {
      store: store,
      curation_date: Date.current,
      status: "ready",
      active: true,
      props_schema_version: schema_version,
      crates: [
        {
          "slug" => "picks",
          "name" => "Milkcrate Picks",
          "count" => 1,
          "records" => [ { "id" => 1, "artist" => "Artist" } ]
        }
      ],
      storefront_sections: [
        {
          "key" => "picks_wall",
          "crate" => {
            "slug" => "picks",
            "name" => "Milkcrate Picks",
            "count" => 1,
            "records" => [ { "id" => 1, "artist" => "Artist" } ]
          }
        }
      ],
      surfaced_listing_ids: [ 1 ],
      generated_at: generated_at,
      metrics: {
        "duration_ms" => 42,
        "payload_bytes" => 1234,
        "crate_count" => 1,
        "surfaced_count" => 1
      }
    }.merge(overrides)
  end

  def failed_attrs(overrides = {})
    ready_attrs({
      status: "failed",
      active: false,
      crates: [],
      storefront_sections: [],
      surfaced_listing_ids: [],
      failure_message: "boom",
      failed_at: generated_at
    }.merge(overrides))
  end

  describe "validations" do
    it "accepts a ready snapshot with the current schema version and payload" do
      expect(described_class.new(ready_attrs)).to be_valid
    end

    it "rejects a ready snapshot without crates or storefront sections" do
      snapshot = described_class.new(ready_attrs(crates: [], storefront_sections: []))

      expect(snapshot).not_to be_valid
      expect(snapshot.errors[:crates]).not_to be_empty
      expect(snapshot.errors[:storefront_sections]).not_to be_empty
    end

    it "allows a failed snapshot to store failure metadata without becoming active" do
      expect(described_class.new(failed_attrs)).to be_valid
    end
  end

  describe ".active_compatible" do
    it "returns the active snapshot matching the current schema version" do
      current = described_class.create!(ready_attrs)
      described_class.create!(ready_attrs(active: false, props_schema_version: schema_version - 1))

      expect(store.active_storefront_snapshot).to eq(current)
    end

    it "rejects an active snapshot with an old schema version" do
      described_class.create!(ready_attrs(active: true, props_schema_version: schema_version - 1))

      expect(store.active_storefront_snapshot).to be_nil
    end
  end

  describe "freshness" do
    it "is fresh when the snapshot was generated today" do
      snapshot = described_class.new(ready_attrs)

      expect(snapshot.fresh?).to be(true)
      expect(snapshot.stale?).to be(false)
    end

    it "is stale when a compatible snapshot was generated yesterday" do
      snapshot = described_class.new(ready_attrs(curation_date: Date.current - 1, generated_at: 1.day.ago))

      expect(snapshot.fresh?).to be(false)
      expect(snapshot.stale?).to be(true)
    end
  end

  describe ".latest_successful" do
    it "returns ready snapshots ordered by newest generated_at first" do
      older = described_class.create!(ready_attrs(generated_at: 2.days.ago))
      newer = described_class.create!(ready_attrs(active: false, generated_at: Time.current))

      expect(described_class.latest_successful.first).to eq(newer)
      expect(described_class.latest_successful.second).to eq(older)
    end
  end

  describe "database invariants" do
    it "rejects two active ready snapshots for the same store" do
      described_class.create!(ready_attrs)

      duplicate = described_class.new(ready_attrs)

      expect { duplicate.save! }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "allows active snapshots for different stores" do
      described_class.create!(ready_attrs)

      other_store = create(:store)
      other_snapshot = described_class.create!(ready_attrs(store: other_store))

      expect(other_snapshot).to be_persisted
      expect(other_snapshot.store).to eq(other_store)
    end
  end

  describe "same-day retries" do
    it "keeps a failed attempt and a later ready retry for the same store and day" do
      failed = described_class.create!(failed_attrs)
      ready = described_class.create!(ready_attrs)

      expect(described_class.where(store: store, curation_date: Date.current).count).to eq(2)
      expect(failed.reload.active).to be(false)
      expect(ready.reload.active).to be(true)
      expect(store.active_storefront_snapshot).to eq(ready)
    end
  end

  describe "ownership" do
    it "destroys snapshots when the store is destroyed" do
      described_class.create!(ready_attrs)

      expect { store.destroy! }.to change(described_class, :count).by(-1)
    end
  end
end
