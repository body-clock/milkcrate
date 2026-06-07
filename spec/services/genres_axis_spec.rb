require "rails_helper"

RSpec.describe GenresAxis do
  subject(:axis) { described_class.new }

  let(:listing) { instance_double(Listing, primary_genre: "Rock", styles: [ "Punk" ]) }

  describe "#key_for" do
    it "returns the listing's primary genre" do
      expect(axis.key_for(listing)).to eq("Rock")
    end
  end

  describe "#matches?" do
    it "is true when the listing's primary genre matches" do
      expect(axis.matches?(listing, "Rock")).to be true
    end

    it "is false when the listing's primary genre does not match" do
      expect(axis.matches?(listing, "Jazz")).to be false
    end
  end

  describe "#tally_from" do
    it "counts listings by primary genre" do
      a = instance_double(Listing, primary_genre: "Rock")
      b = instance_double(Listing, primary_genre: "Rock")
      c = instance_double(Listing, primary_genre: "Jazz")

      expect(axis.tally_from([ a, b, c ])).to eq("Rock" => 2, "Jazz" => 1)
    end

    it "excludes listings with nil primary genre" do
      a = instance_double(Listing, primary_genre: nil)

      expect(axis.tally_from([ a ])).to eq({})
    end
  end
end
