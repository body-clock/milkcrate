require "rails_helper"

RSpec.describe CrateStrategies::Thematic do
  subject(:strategy) { described_class.new(store_id: 1, genre_counts: {}, today: Date.new(2026, 5, 27)) }

  let(:scorer) { instance_double(RecordScorer) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
    allow(scorer).to receive(:score) { |listing| listing.id }
  end

  def listing(id, style:)
    instance_double(Listing, id:, styles: [ style ], primary_genre: nil, sort_key: [ id ])
  end

  it "selects and ranks records from an eligible storefront theme" do
    themed = (1..4).map { |id| listing(id, style: "Rare Groove") }
    outside_theme = listing(5, style: "Bebop")

    name, selected = strategy.select(themed + [ outside_theme ], excluded_ids: Set.new)

    expect(name).to eq("Rare Groove")
    expect(selected).to eq(themed.reverse)
  end
end
