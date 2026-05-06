require "rails_helper"

RSpec.describe NewArrivalsPolicy do
  subject(:policy) { described_class.new }

  def listing(id:, listed_at:)
    double("Listing", id: id, listed_at: listed_at)
  end

  describe "#select" do
    let(:sort_key) { ->(l) { l.listed_at.to_i } }

    it "returns empty array for empty pool" do
      expect(policy.select([], sort_key: sort_key)).to eq([])
    end

    it "selects from the newest window when it has enough records" do
      recent_listings = (1..5).map { |i| listing(id: i, listed_at: 1.day.ago) }
      old_listings = (6..10).map { |i| listing(id: i, listed_at: 60.days.ago) }
      pool = recent_listings + old_listings

      result = policy.select(pool, sort_key: sort_key)
      expect(result.size).to eq(4)
      expect(result.all? { |l| l.listed_at >= 7.days.ago }).to be true
    end

    it "falls back to broader windows when newest window has too few records" do
      recent = (1..2).map { |i| listing(id: i, listed_at: 2.days.ago) }
      medium = (3..6).map { |i| listing(id: i, listed_at: 10.days.ago) }
      pool = recent + medium

      result = policy.select(pool, sort_key: sort_key)
      expect(result.size).to eq(4)
      expect(result.all? { |l| l.listed_at >= 14.days.ago }).to be true
    end

    it "falls back to most recent overall when no window has enough" do
      old_listings = (1..5).map { |i| listing(id: i, listed_at: 400.days.ago) }
      result = policy.select(old_listings, sort_key: sort_key)
      expect(result.size).to eq(4)
    end
  end
end
