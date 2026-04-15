require "spec_helper"
require_relative "../../app/services/pick_narrative"

RSpec.describe PickNarrative do
  ListingDouble = Struct.new(:styles, :genres, :year, :condition, keyword_init: true)

  describe "#reasons" do
    it "explains the strongest discovery signals in score order" do
      listing = ListingDouble.new(
        styles: [ "Afrobeat", "Experimental" ],
        genres: [ "Jazz", "Funk" ],
        year: 1973,
        condition: "VG+"
      )

      reasons = described_class.new(listing, genre_counts: { "Jazz" => 3, "Funk" => 7 }).reasons

      expect(reasons).to eq(
        [
          "Discovery styles: Afrobeat, Experimental",
          "Genre crossover: Jazz + Funk",
          "Vintage press: 1973"
        ]
      )
    end

    it "surfaces thin-section records when other signals are absent" do
      listing = ListingDouble.new(
        styles: [],
        genres: [ "Gospel" ],
        year: 1988,
        condition: "G"
      )

      reasons = described_class.new(listing, genre_counts: { "Gospel" => 2 }).reasons

      expect(reasons).to eq([ "From a thin section: only 2 Gospel records in today's crate" ])
    end

    it "limits the output to three reasons" do
      listing = ListingDouble.new(
        styles: [ "Dub" ],
        genres: [ "Reggae", "Funk" ],
        year: 1977,
        condition: "NM"
      )

      reasons = described_class.new(listing, genre_counts: { "Reggae" => 1 }).reasons

      expect(reasons.size).to eq(3)
      expect(reasons).not_to include("Clean copy: NM")
    end
  end
end
