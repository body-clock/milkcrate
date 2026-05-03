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

  def arel_nodes(node)
    children = node
      .instance_variables
      .flat_map { |ivar| Array(node.instance_variable_get(ivar)) }
      .select { |value| value.is_a?(Arel::Nodes::Node) }

    [ node.class, *children.flat_map { |child| arel_nodes(child) } ]
  end
end
