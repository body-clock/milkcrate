require "rails_helper"

RSpec.describe ScoreStrategies::SectionStrategy do
  def listing(genre:)
    build_stubbed(:listing, genres: [ genre ])
  end

  describe "#score" do
    it "returns 3.0 when genre has fewer than 5 listings" do
      strategy = described_class.new(genre_counts: { "Jazz" => 4 })
      expect(strategy.score(listing(genre: "Jazz"))).to eq(3.0)
    end

    it "returns 0.0 when genre has 5 or more listings" do
      strategy = described_class.new(genre_counts: { "Jazz" => 5 })
      expect(strategy.score(listing(genre: "Jazz"))).to eq(0.0)
    end

    it "returns 3.0 when genre is missing from counts (treated as small section)" do
      strategy = described_class.new(genre_counts: { "Rock" => 10 })
      expect(strategy.score(listing(genre: "Jazz"))).to eq(3.0)
    end

    it "returns 3.0 when primary_genre is nil (treated as small section)" do
      strategy = described_class.new(genre_counts: { "Rock" => 10 })
      listing = build_stubbed(:listing, genres: [])
      expect(strategy.score(listing)).to eq(3.0)
    end
  end
end
