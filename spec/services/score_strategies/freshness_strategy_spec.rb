require "rails_helper"

RSpec.describe ScoreStrategies::FreshnessStrategy do
  include ActiveSupport::Testing::TimeHelpers

  def listing(last_surfaced_at:)
    build_stubbed(:listing, last_surfaced_at:)
  end

  describe "#score" do
    it "returns 3.0 for never-surfaced records" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      expect(strategy.score(listing(last_surfaced_at: nil))).to eq(3.0)
    end

    it "returns -5 for records surfaced in the last 3 days" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      expect(strategy.score(listing(last_surfaced_at: Date.new(2026, 5, 4)))).to eq(-5.0)
    end

    it "returns -3 for records surfaced 4-7 days ago" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      expect(strategy.score(listing(last_surfaced_at: Date.new(2026, 4, 29)))).to eq(-3.0)
    end

    it "returns -1 for records surfaced 8-14 days ago" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      expect(strategy.score(listing(last_surfaced_at: Date.new(2026, 4, 27)))).to eq(-1.0)
    end

    it "returns 1.0 for records surfaced 15+ days ago" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      expect(strategy.score(listing(last_surfaced_at: Date.new(2026, 4, 15)))).to eq(1.0)
    end

    it "returns -5 for records surfaced today" do
      strategy = described_class.new(today: Date.new(2026, 5, 5))
      expect(strategy.score(listing(last_surfaced_at: Date.new(2026, 5, 5)))).to eq(-5.0)
    end
  end
end
