require "rails_helper"

RSpec.describe SyncStrategies::Result do
  describe ".new" do
    it "creates with listings and complete flag" do
      result = described_class.new(listings: [], complete: true)
      expect(result.listings).to eq([])
      expect(result.complete?).to be true
    end

    it "creates with listings and complete: false" do
      result = described_class.new(listings: [], complete: false)
      expect(result.complete?).to be false
    end

    it "is frozen" do
      result = described_class.new(listings: [], complete: false)
      expect(result).to be_frozen
    end

    it "responds to both #complete? and #complete" do
      result = described_class.new(listings: [], complete: true)
      expect(result.complete?).to be result.complete
    end
  end

  describe "#listings" do
    it "returns the listings array" do
      listings = [ { discogs_listing_id: "1" }, { discogs_listing_id: "2" } ]
      result = described_class.new(listings:, complete: false)
      expect(result.listings).to eq(listings)
    end

    it "allows empty listings" do
      result = described_class.new(listings: [], complete: true)
      expect(result.listings).to eq([])
    end
  end
end
