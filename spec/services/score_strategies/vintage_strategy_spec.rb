require "rails_helper"

RSpec.describe ScoreStrategies::VintageStrategy do
  subject(:strategy) { described_class.new }

  def listing(year:)
    build_stubbed(:listing, year:)
  end

  describe "#score" do
    it "returns 2.0 for records from before 1980" do
      expect(strategy.score(listing(year: 1979))).to eq(2.0)
    end

    it "returns 0.0 for records from 1980 or later" do
      expect(strategy.score(listing(year: 1980))).to eq(0.0)
      expect(strategy.score(listing(year: 2025))).to eq(0.0)
    end

    it "returns 0.0 when year is nil" do
      expect(strategy.score(listing(year: nil))).to eq(0.0)
    end
  end
end
