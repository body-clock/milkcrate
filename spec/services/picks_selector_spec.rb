require "spec_helper"
require "digest"
require "active_support/core_ext/date/calculations"
require_relative "../../app/services/picks_selector"

RSpec.describe PicksSelector do
  FakeRelation = Struct.new(:records) do
    def where(id: nil)
      return self unless id

      self.class.new(records.select { |record| id.include?(record.id) })
    end

    def not(genres:)
      filtered = records.reject do |record|
        genres == "{}" && Array(record.genres).empty?
      end

      self.class.new(filtered)
    end

    def pluck(attribute)
      records.map { |record| record.public_send(attribute) }
    end

    def to_a
      records
    end
  end

  FakeWhereChain = Struct.new(:relation) do
    def not(**kwargs)
      relation.not(**kwargs)
    end
  end

  FakeListingsScope = Struct.new(:records) do
    def where(*args, **kwargs)
      return FakeWhereChain.new(FakeRelation.new(records)) if args.empty? && kwargs.empty?

      FakeRelation.new(records).where(**kwargs)
    end

    def pluck(attribute)
      records.map { |record| record.public_send(attribute) }
    end
  end

  FakeListing = Struct.new(:id, :genres, :styles, :year, :condition, keyword_init: true) do
    def primary_genre
      genres.first
    end
  end

  describe "#select" do
    it "scores discovery records buried in crowded sections above safer generic picks" do
      buried_gem = FakeListing.new(
        id: 1,
        genres: [ "Electronic" ],
        styles: [ "Ambient" ],
        year: 1992,
        condition: "VG"
      )
      generic_electronic = FakeListing.new(
        id: 2,
        genres: [ "Electronic", "Jazz" ],
        styles: [],
        year: 1978,
        condition: "VG+"
      )
      supporting_records = Array.new(16) do |index|
        FakeListing.new(
          id: index + 10,
          genres: [ "Electronic" ],
          styles: [],
          year: 1995,
          condition: "VG"
        )
      end

      listings = [ buried_gem, generic_electronic ] + supporting_records
      store = double("Store", listings: FakeListingsScope.new(listings))
      selector = described_class.new(store)

      scores = selector.send(:score_all).to_h

      expect(scores.fetch(buried_gem)).to be > scores.fetch(generic_electronic)
    end
  end

  describe "#score" do
    it "boosts records with styles that are rare within the store catalog" do
      selector = described_class.new(double("store"))

      common_listing = FakeListing.new(
        id: 100,
        genres: [ "Electronic" ],
        styles: [ "House" ],
        condition: "VG+"
      )

      rare_style_listing = FakeListing.new(
        id: 101,
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
