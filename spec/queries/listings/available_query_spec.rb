require "rails_helper"

RSpec.describe Listings::AvailableQuery do
  include ActiveSupport::Testing::TimeHelpers

  around do |example|
    travel_to(Time.zone.parse("2026-05-05 12:00:00")) { example.run }
  end

  describe "#call" do
    it "keeps listings seen during latest store sync window" do
      synced_store = create(:store, last_synced_at: 2.hours.ago)
      fresh = create(:listing, store: synced_store, last_seen_at: 30.minutes.ago)
      stale = create(:listing, store: synced_store, last_seen_at: 40.hours.ago)

      expect(described_class.new.call).to include(fresh)
      expect(described_class.new.call).not_to include(stale)
    end

    it "treats listings missing from the latest synced inventory as unavailable" do
      synced_store = create(:store, last_synced_at: 2.hours.ago)
      before_sync = create(:listing, store: synced_store, last_seen_at: 3.hours.ago)
      after_sync  = create(:listing, store: synced_store, last_seen_at: 30.minutes.ago)

      expect(described_class.new.call).to include(after_sync)
      expect(described_class.new.call).not_to include(before_sync)
    end

    it "falls back to recent-seen window for never-synced stores" do
      never_synced_store = create(:store, last_synced_at: nil)
      recent = create(:listing, store: never_synced_store, last_seen_at: 2.days.ago)
      old = create(:listing, store: never_synced_store, last_seen_at: 5.days.ago)

      expect(described_class.new.call).to include(recent)
      expect(described_class.new.call).not_to include(old)
    end

    it "uses the rolling mirror window for partial stores" do
      partial_store = create(:store, catalog_coverage: "partial", last_synced_at: 2.hours.ago)
      recent = create(:listing, store: partial_store, last_seen_at: 2.days.ago)
      old = create(:listing, store: partial_store, last_seen_at: 5.days.ago)

      expect(described_class.new.call).to include(recent)
      expect(described_class.new.call).not_to include(old)
    end

    it "accepts a custom relation" do
      store1 = create(:store, last_synced_at: 1.hour.ago)
      store2 = create(:store, last_synced_at: 1.hour.ago)
      listing1 = create(:listing, store: store1, last_seen_at: 1.minute.ago)
      listing2 = create(:listing, store: store2, last_seen_at: 1.minute.ago)

      result = described_class.new(relation: Listing.where(store: store1)).call
      expect(result).to include(listing1)
      expect(result).not_to include(listing2)
    end

    it "accepts a custom recency threshold" do
      store = create(:store, last_synced_at: nil)
      old = create(:listing, store:, last_seen_at: 10.days.ago)

      result = described_class.new(recency_threshold: 14.days).call
      expect(result).to include(old)
    end

    it "returns empty when no listings match" do
      store = create(:store, last_synced_at: 1.hour.ago)
      create(:listing, store:, last_seen_at: 40.hours.ago)

      expect(described_class.new.call).to be_empty
    end
  end
end
