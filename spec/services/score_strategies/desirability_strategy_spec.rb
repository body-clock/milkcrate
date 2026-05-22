require "rails_helper"

RSpec.describe ScoreStrategies::DesirabilityStrategy do
  subject(:strategy) { described_class.new }

  describe "#score" do
    it "returns higher score for high want/have ratio vs low ratio" do
      coveted = build_listing(want_count: 800, have_count: 300)
      common  = build_listing(want_count: 100, have_count: 500)
      expect(strategy.score(coveted)).to be > strategy.score(common)
    end

    it "scores higher for deeper market at same ratio" do
      deep = build_listing(want_count: 500, have_count: 500)
      thin = build_listing(want_count: 1, have_count: 1)
      expect(strategy.score(deep)).to be > strategy.score(thin)
    end

    it "handles zero counts without error" do
      zero = build_listing(want_count: 0, have_count: 0)
      expect { strategy.score(zero) }.not_to raise_error
    end

    it "handles nil counts without error" do
      nil_counts = build_listing(want_count: nil, have_count: nil)
      expect { strategy.score(nil_counts) }.not_to raise_error
    end
  end

  describe "#desirable?" do
    it "returns true for high want/have ratio above threshold" do
      expect(strategy.desirable?(build_listing(want_count: 800, have_count: 300))).to be(true)
    end

    it "returns false for low want/have ratio" do
      expect(strategy.desirable?(build_listing(want_count: 100, have_count: 500))).to be(false)
    end

    it "returns false when have is below minimum" do
      expect(strategy.desirable?(build_listing(want_count: 0, have_count: 0))).to be(false)
    end
  end
end
