require "rails_helper"

RSpec.describe PicksSelector do
  describe "#select_picks" do
    it "returns highest-scoring records" do
      store = create(:store)
      high = create(:listing, store:, format: "LP", genres: [ "Jazz" ], styles: [ "Afro-Jazz" ], year: 1972, condition: "NM")
      low  = create(:listing, store:, format: "LP", genres: [ "Rock" ], styles: [], year: nil, condition: "Generic")

      result = described_class.new(store).select_picks(count: 12)

      expect(result).to include(high)
    end

    it "caps per-genre representation for diversity" do
      store = create(:store)
      jazz_listings = create_list(:listing, 10, store:, format: "LP", genres: [ "Jazz" ], styles: [ "Afro-Jazz" ], year: 1970, condition: "NM")
      rock_listing  = create(:listing, store:, format: "LP", genres: [ "Rock" ], styles: [ "Psych" ], year: 1968, condition: "NM")

      result = described_class.new(store).select_picks(count: 6)

      jazz_count = result.count { |l| l.primary_genre == "Jazz" }
      expect(jazz_count).to be <= 4
    end
  end
end
