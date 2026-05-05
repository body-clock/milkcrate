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
      stale = create(:listing, store: synced_store, last_seen_at: 3.hours.ago)

      expect(described_class.available).to include(fresh)
      expect(described_class.available).not_to include(stale)
    end

    it "keeps listings seen shortly before sync cutoff to allow sync buffer" do
      synced_store = create(:store, last_synced_at: 2.hours.ago)
      buffered = create(:listing, store: synced_store, last_seen_at: 2.hours.ago - 10.minutes)
      stale = create(:listing, store: synced_store, last_seen_at: 2.hours.ago - 40.minutes)

      expect(described_class.available).to include(buffered)
      expect(described_class.available).not_to include(stale)
    end

    it "falls back to recent-seen window for never-synced stores" do
      never_synced_store = create(:store, last_synced_at: nil)
      recent = create(:listing, store: never_synced_store, last_seen_at: 2.days.ago)
      old = create(:listing, store: never_synced_store, last_seen_at: 5.days.ago)

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

    it "does not build its predicates from raw SQL literals" do
      expect(arel_nodes(described_class.lp_only.where_clause.ast)).not_to include(Arel::Nodes::SqlLiteral)
    end
  end

  def arel_nodes(node)
    children = node
      .instance_variables
      .flat_map { |ivar| Array(node.instance_variable_get(ivar)) }
      .select { |value| value.is_a?(Arel::Nodes::Node) }

    [ node.class, *children.flat_map { |child| arel_nodes(child) } ]
  end
end
