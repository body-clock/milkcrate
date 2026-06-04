require "rails_helper"

RSpec.describe CrateStrategies::Wall do
  subject(:strategy) { described_class.new(genre_counts: {}, today: Date.new(2026, 5, 27)) }

  let(:scorer) { instance_double(RecordScorer, score: 10) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
  end

  def listing(id, genre)
    instance_double(Listing, id:, primary_genre: genre)
  end

  it "derives its genre cap from the requested count" do
    pool = [ listing(1, "Jazz"), listing(2, "Jazz"), listing(3, "Jazz") ]

    selected = strategy.select(pool, excluded_ids: Set.new, count: 3)

    expect(selected.size).to eq(2)
  end

  it "applies its genre cap to listings without a primary genre" do
    pool = [ listing(1, nil), listing(2, nil), listing(3, nil) ]

    selected = strategy.select(pool, excluded_ids: Set.new, count: 3)

    expect(selected.size).to eq(2)
  end
end
