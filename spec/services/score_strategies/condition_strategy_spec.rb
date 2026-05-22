require "rails_helper"

RSpec.describe ScoreStrategies::ConditionStrategy do
  subject(:strategy) { described_class.new }

  def listing(condition:)
    build_stubbed(:listing, condition:)
  end

  describe "#score" do
    it "returns 1.0 for Mint condition" do
      expect(strategy.score(listing(condition: "Mint"))).to eq(1.0)
    end

    it "returns 1.0 for NM condition" do
      expect(strategy.score(listing(condition: "NM"))).to eq(1.0)
    end

    it "returns 1.0 for M condition" do
      expect(strategy.score(listing(condition: "M"))).to eq(1.0)
    end

    it "returns 1.0 for VG+ condition" do
      expect(strategy.score(listing(condition: "VG+"))).to eq(1.0)
    end

    it "returns 1.0 for aliased 'Near Mint'" do
      expect(strategy.score(listing(condition: "Near Mint"))).to eq(1.0)
    end

    it "returns 1.0 for aliased 'm-'" do
      expect(strategy.score(listing(condition: "m-"))).to eq(1.0)
    end

    it "returns 1.0 for aliased 'mint-'" do
      expect(strategy.score(listing(condition: "mint-"))).to eq(1.0)
    end

    it "returns 1.0 with leading/trailing whitespace" do
      expect(strategy.score(listing(condition: "  NM  "))).to eq(1.0)
    end

    it "returns 0.0 for Generic condition" do
      expect(strategy.score(listing(condition: "Generic"))).to eq(0.0)
    end

    it "returns 0.0 for nil condition" do
      expect(strategy.score(listing(condition: nil))).to eq(0.0)
    end

    it "returns 0.0 for VG (no plus) condition" do
      expect(strategy.score(listing(condition: "VG"))).to eq(0.0)
    end
  end

  describe "#good_condition?" do
    it "returns true for good conditions" do
      expect(strategy.good_condition?(listing(condition: "NM"))).to be(true)
    end

    it "returns false for poor conditions" do
      expect(strategy.good_condition?(listing(condition: "Generic"))).to be(false)
    end
  end
end
