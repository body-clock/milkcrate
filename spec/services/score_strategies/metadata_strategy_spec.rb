require "rails_helper"

RSpec.describe ScoreStrategies::MetadataStrategy do
  subject(:strategy) { described_class.new }

  def listing(overrides = {})
    build_stubbed(:listing, genres: [ "Jazz" ], styles: [ "Modal" ], year: 1975, **overrides)
  end

  describe "#score" do
    it "returns 0.0 for listings with styles, multiple genres, and year" do
      expect(strategy.score(listing(styles: [ "Modal" ], genres: [ "Jazz", "Fusion" ], year: 1975))).to eq(0.0)
    end

    it "returns -1.0 when listing has no styles, single genre, and no year" do
      expect(strategy.score(listing(styles: [], genres: [ "Jazz" ], year: nil))).to eq(-1.0)
    end

    it "returns 0.0 when listing has styles but no year or genre" do
      expect(strategy.score(listing(styles: [ "Modal" ], genres: [ "Jazz" ], year: nil))).to eq(0.0)
    end

    it "returns 0.0 when listing has year but no styles" do
      expect(strategy.score(listing(styles: [], genres: [ "Jazz" ], year: 1975))).to eq(0.0)
    end

    it "returns 0.0 when listing has genres, styles, but no year" do
      listing = build_stubbed(:listing, genres: [ "Jazz" ], styles: [ "Modal" ], year: nil)
      expect(strategy.score(listing)).to eq(0.0)
    end

    it "returns -1.0 when genres is empty, no styles, no year" do
      listing = build_stubbed(:listing, genres: [], styles: [], year: nil)
      expect(strategy.score(listing)).to eq(-1.0)
    end
  end
end
