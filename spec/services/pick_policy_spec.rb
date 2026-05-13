require "rails_helper"

RSpec.describe PickPolicy do
  subject(:policy) { described_class.new }

  describe "#genre_cap" do
    it "returns 2 for small pick counts" do
      expect(policy.genre_cap(3)).to eq(2)
      expect(policy.genre_cap(4)).to eq(2)
      expect(policy.genre_cap(6)).to eq(2)
    end

    it "returns count/3 for larger pick counts" do
      expect(policy.genre_cap(12)).to eq(4)
      expect(policy.genre_cap(30)).to eq(10)
    end
  end

  describe "#sort_key" do
    let(:listing) { double("Listing", id: 42) }
    let(:seed) { 12345 }

    it "returns score-descending then deterministic-hash ordering" do
      key = policy.sort_key(listing, 5.0, seed)
      expect(key[0]).to eq(-5.0)
      expect(key[1]).to be_a(String)
    end

    it "produces consistent results for same inputs" do
      expect(policy.sort_key(listing, 3.0, seed)).to eq(policy.sort_key(listing, 3.0, seed))
    end
  end
end
