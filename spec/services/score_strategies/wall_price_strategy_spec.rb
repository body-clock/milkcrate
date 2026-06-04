require "rails_helper"

RSpec.describe ScoreStrategies::WallPriceStrategy do
  subject(:strategy) { described_class.new }

  def listing(price:)
    build_stubbed(:listing, price:)
  end

  describe "#score" do
    it "returns 1.0 for records priced $20 or more" do
      expect(strategy.score(listing(price: 20.00))).to eq(1.0)
      expect(strategy.score(listing(price: 35.99))).to eq(1.0)
      expect(strategy.score(listing(price: 500.00))).to eq(1.0)
    end

    it "returns 0.0 for records priced under $20" do
      expect(strategy.score(listing(price: 19.99))).to eq(0.0)
      expect(strategy.score(listing(price: 10.00))).to eq(0.0)
      expect(strategy.score(listing(price: 5.00))).to eq(0.0)
    end

    it "returns 0.0 for records with no price" do
      expect(strategy.score(build_stubbed(:listing, price: nil))).to eq(0.0)
    end

    it "returns 0.0 for records priced at $0" do
      expect(strategy.score(listing(price: 0.00))).to eq(0.0)
    end
  end
end
