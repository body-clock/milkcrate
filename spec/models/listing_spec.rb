require "rails_helper"

RSpec.describe Listing, type: :model do
  let(:store) { create(:store) }

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

  describe ".available" do
    it "includes listings seen in the latest store sync snapshot" do
      store.update!(last_synced_at: Time.current)
      fresh = create(:listing, store:, last_seen_at: 1.hour.ago)
      stale = create(:listing, store:, last_seen_at: 2.days.ago)

      expect(described_class.available).to include(fresh)
      expect(described_class.available).not_to include(stale)
    end

    it "keeps listings from long sync runs via a small last_seen_at buffer" do
      synced_at = Time.current
      store.update!(last_synced_at: synced_at)
      buffered = create(:listing, store:, last_seen_at: synced_at - 4.hours)

      expect(described_class.available).to include(buffered)
    end

    it "falls back to any seen listing when store has never synced" do
      store.update!(last_synced_at: nil)
      seen = create(:listing, store:, last_seen_at: 10.days.ago)
      unseen = create(:listing, store:, last_seen_at: nil)

      expect(described_class.available).to include(seen)
      expect(described_class.available).not_to include(unseen)
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
