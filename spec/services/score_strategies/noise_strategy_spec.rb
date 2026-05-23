require "rails_helper"

RSpec.describe ScoreStrategies::NoiseStrategy do
  describe "#score" do
    it "returns deterministic value for same listing and date" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      first  = strategy.score(build_listing(id: 42))
      second = strategy.score(build_listing(id: 42))
      expect(first).to eq(second)
    end

    it "returns different value for different date" do
      day1 = described_class.new(today: Date.new(2026, 5, 5)).score(build_listing(id: 42))
      day2 = described_class.new(today: Date.new(2026, 5, 6)).score(build_listing(id: 42))
      expect(day1).not_to eq(day2)
    end

    it "returns different value for different listing on same day" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      first  = strategy.score(build_listing(id: 1))
      second = strategy.score(build_listing(id: 2))
      expect(first).not_to eq(second)
    end

    it "returns a float between -1.5 and 1.5" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      score = strategy.score(build_listing(id: 42))
      expect(score).to be_between(-1.5, 1.5)
    end
  end
end
