require "rails_helper"

RSpec.describe ScoreStrategies::VintageStrategy do
  subject(:strategy) { described_class.new }

  describe "#score" do
    it "returns 1.0 for records from 1960 to 1979" do
      expect(strategy.score(build_listing(year: 1965))).to eq(1.0)
      expect(strategy.score(build_listing(year: 1979))).to eq(1.0)
    end

    it "returns 0.0 for records from before 1960" do
      expect(strategy.score(build_listing(year: 1959))).to eq(0.0)
      expect(strategy.score(build_listing(year: 1940))).to eq(0.0)
    end

    it "returns 0.0 for records from 1980 or later" do
      expect(strategy.score(build_listing(year: 1980))).to eq(0.0)
      expect(strategy.score(build_listing(year: 2025))).to eq(0.0)
    end

    it "returns 0.0 when year is nil" do
      expect(strategy.score(build_listing(year: nil))).to eq(0.0)
    end
  end
end
