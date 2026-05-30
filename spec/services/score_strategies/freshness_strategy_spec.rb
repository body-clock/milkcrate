require "rails_helper"

RSpec.describe ScoreStrategies::FreshnessStrategy do
  describe "#score" do
    it "returns 0.5 for never-surfaced records" do
      strategy = described_class.new
      expect(strategy.score(build_listing(last_surfaced_at: nil))).to eq(0.5)
    end

    it "returns -0.5 for records that have been surfaced" do
      strategy = described_class.new
      expect(strategy.score(build_listing(last_surfaced_at: Date.new(2026, 5, 4)))).to eq(-0.5)
    end

    it "returns -0.5 regardless of how long ago the record was surfaced" do
      strategy = described_class.new
      expect(strategy.score(build_listing(last_surfaced_at: Date.new(2026, 1, 1)))).to eq(-0.5)
    end
  end
end
