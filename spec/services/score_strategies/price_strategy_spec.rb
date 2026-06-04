require "rails_helper"

RSpec.describe ScoreStrategies::PriceStrategy do
  subject(:strategy) { described_class.new }

  def listing(price:)
    build_stubbed(:listing, price:)
  end

  describe "#score" do
    it "returns 1.0 for records priced $10 or more" do
      expect(strategy.score(listing(price: 10.00))).to eq(1.0)
      expect(strategy.score(listing(price: 15.99))).to eq(1.0)
      expect(strategy.score(listing(price: 250.00))).to eq(1.0)
    end

    it "returns 0.0 for records priced under $10" do
      expect(strategy.score(listing(price: 9.99))).to eq(0.0)
      expect(strategy.score(listing(price: 2.00))).to eq(0.0)
    end

    it "returns 0.0 for records with no price" do
      expect(strategy.score(build_stubbed(:listing, price: nil))).to eq(0.0)
    end

    it "returns 0.0 for records priced at $0" do
      expect(strategy.score(listing(price: 0.00))).to eq(0.0)
    end
  end
end
