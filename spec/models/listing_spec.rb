require "rails_helper"

RSpec.describe Listing, type: :model do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }

  describe ".available" do
    around do |example|
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) { example.run }
    end

    it "keeps listings seen during latest store sync window" do
      synced_store = create(:store, last_synced_at: 2.hours.ago)
      fresh = create(:listing, store: synced_store, last_seen_at: 30.minutes.ago)
      stale = create(:listing, store: synced_store, last_seen_at: 40.hours.ago)

      expect(described_class.available).to include(fresh)
      expect(described_class.available).not_to include(stale)
    end

    it "treats listings missing from the latest synced inventory as unavailable" do
      synced_store = create(:store, last_synced_at: 2.hours.ago)
      before_sync = create(:listing, store: synced_store, last_seen_at: 3.hours.ago)
      after_sync  = create(:listing, store: synced_store, last_seen_at: 30.minutes.ago)

      expect(described_class.available).to include(after_sync)
      expect(described_class.available).not_to include(before_sync)
    end

    it "falls back to recent-seen window for never-synced stores" do
      never_synced_store = create(:store, last_synced_at: nil)
      recent = create(:listing, store: never_synced_store, last_seen_at: 2.days.ago)
      old = create(:listing, store: never_synced_store, last_seen_at: 5.days.ago)

      expect(described_class.available).to include(recent)
      expect(described_class.available).not_to include(old)
    end

    it "uses the rolling mirror window for partial stores" do
      partial_store = create(:store, catalog_coverage: "partial", last_synced_at: 2.hours.ago)
      recent = create(:listing, store: partial_store, last_seen_at: 2.days.ago)
      old = create(:listing, store: partial_store, last_seen_at: 5.days.ago)

      expect(described_class.available).to include(recent)
      expect(described_class.available).not_to include(old)
    end
  end

  describe ".lp_only" do
    it "includes LP and album formats while excluding non-vinyl media" do
      lp = create(:listing, store:, format: "Vinyl, LP")
      album = create(:listing, store:, format: "Vinyl, Album")
      cd = create(:listing, store:, format: "CD, Album")
      cassette = create(:listing, store:, format: "Cassette, Album")
      vinyl_only = create(:listing, store:, format: "Vinyl")

      expect(described_class.lp_only).to contain_exactly(lp, album)
      expect(described_class.lp_only).not_to include(cd, cassette, vinyl_only)
    end

    it "executes without SQL errors" do
      expect { described_class.lp_only.load }.not_to raise_error
    end
  end
end
