require "spec_helper"
require "digest"
require_relative "../../app/services/picks_selector"

RSpec.describe PicksSelector do
  ListingStub = Struct.new(:styles, :genres, :year, :condition, keyword_init: true) do
    def primary_genre
      genres.first
    end
  end

  describe "#score" do
    it "boosts records with styles that are rare within the store catalog" do
      selector = described_class.new(double("store"))

      common_listing = ListingStub.new(
        genres: [ "Electronic" ],
        styles: [ "House" ],
        condition: "VG+"
      )

      rare_style_listing = ListingStub.new(
        genres: [ "Electronic" ],
        styles: [ "Broken Beat" ],
        condition: "VG+"
      )

      genre_counts = { "Electronic" => 6 }
      style_counts = { "House" => 6, "Broken Beat" => 1 }

      common_score = selector.send(:score, common_listing, genre_counts, style_counts)
      rare_score = selector.send(:score, rare_style_listing, genre_counts, style_counts)

      expect(rare_score).to be > common_score
    end
  end
end
