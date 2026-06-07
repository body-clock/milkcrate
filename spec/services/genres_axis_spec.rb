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

  describe "#main_counts" do
    it "returns all genre counts" do
      a = instance_double(Listing, primary_genre: "Rock")
      b = instance_double(Listing, primary_genre: "Jazz")

      expect(axis.main_counts([ a, b ])).to eq("Rock" => 1, "Jazz" => 1)
    end
  end

  describe "#allocation_order" do
    it "sorts genres by count descending then name" do
      a = instance_double(Listing, primary_genre: "Rock")
      b = instance_double(Listing, primary_genre: "Rock")
      c = instance_double(Listing, primary_genre: "Jazz")

      expect(axis.allocation_order([ a, b, c ])).to eq(%w[Rock Jazz])
    end
  end

  describe "#display_order" do
    it "matches allocation order" do
      a = instance_double(Listing, primary_genre: "Rock")
      b = instance_double(Listing, primary_genre: "Jazz")

      expect(axis.display_order([ a, b ])).to eq(axis.allocation_order([ a, b ]))
    end
  end

  describe "#thematic_candidates" do
    it "returns StorefrontTheme objects for genres and styles in the pool" do
      a = instance_double(Listing, primary_genre: "Rock", styles: [ "Punk" ])

      candidates = axis.thematic_candidates([ a ])

      expect(candidates).to all(be_a(StorefrontTheme))
      slugs = candidates.map(&:slug)
      expect(slugs).to include("style-punk", "genre-rock")
    end

    it "excludes nil styles" do
      a = instance_double(Listing, primary_genre: "Rock", styles: nil)

      candidates = axis.thematic_candidates([ a ])

      expect(candidates.map(&:slug)).to eq([ "genre-rock" ])
    end
  end
end
