require "spec_helper"
require "digest"
require "active_support/core_ext/date/calculations"
require_relative "../../app/services/picks_selector"

RSpec.describe PicksSelector do
  PSFakeRelation = Struct.new(:records) do
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

  PSFakeWhereChain = Struct.new(:relation) do
    def not(**kwargs)
      relation.not(**kwargs)
    end
  end

  PSFakeListingsScope = Struct.new(:records) do
    def where(*args, **kwargs)
      return PSFakeWhereChain.new(PSFakeRelation.new(records)) if args.empty? && kwargs.empty?

      PSFakeRelation.new(records).where(**kwargs)
    end

    def pluck(attribute)
      records.map { |record| record.public_send(attribute) }
    end
  end

  PSFakeListing = Struct.new(:id, :genres, :styles, :year, :condition, :want_count, :have_count, keyword_init: true) do
    def primary_genre
      genres.first
    end
  end

  describe "#select" do
    it "scores discovery records buried in crowded sections above safer generic picks" do
      buried_gem = PSFakeListing.new(
        id: 1,
        genres: [ "Electronic" ],
        styles: [ "Ambient" ],
        year: 1992,
        condition: "VG"
      )
      generic_electronic = PSFakeListing.new(
        id: 2,
        genres: [ "Electronic", "Jazz" ],
        styles: [],
        year: 1978,
        condition: "VG+"
      )
      supporting_records = Array.new(16) do |index|
        PSFakeListing.new(
          id: index + 10,
          genres: [ "Electronic" ],
          styles: [],
          year: 1995,
          condition: "VG"
        )
      end

      listings = [ buried_gem, generic_electronic ] + supporting_records
      store = double("Store", listings: PSFakeListingsScope.new(listings))
      selector = described_class.new(store)

      scores = selector.send(:score_all).to_h

      expect(scores.fetch(buried_gem)).to be > scores.fetch(generic_electronic)
    end
  end

  describe "#rank" do
    it "returns listings sorted by score descending" do
      high_score = PSFakeListing.new(
        id: 1,
        genres: [ "Jazz" ],
        styles: [ "Afro-Jazz" ],
        year: 1972,
        condition: "NM"
      )
      low_score = PSFakeListing.new(
        id: 2,
        genres: [ "Rock" ],
        styles: [],
        year: nil,
        condition: "Generic"
      )
      store = double("Store", listings: PSFakeListingsScope.new([ high_score, low_score ]))
      selector = described_class.new(store)

      result = selector.rank

      expect(result.first).to eq(high_score)
      expect(result.last).to eq(low_score)
    end

    it "filters to provided listing_ids" do
      included = PSFakeListing.new(
        id: 1,
        genres: [ "Jazz" ],
        styles: [ "Afro-Jazz" ],
        year: 1972,
        condition: "NM"
      )
      excluded = PSFakeListing.new(
        id: 2,
        genres: [ "Rock" ],
        styles: [ "Classic Rock" ],
        year: 1975,
        condition: "VG+"
      )
      store = double("Store", listings: PSFakeListingsScope.new([ included, excluded ]))
      selector = described_class.new(store)

      result = selector.rank(listing_ids: [ 1 ])

      expect(result.map(&:id)).to eq([ 1 ])
    end
  end

  describe "#score" do
    it "boosts records with styles that are rare within the store catalog" do
      selector = described_class.new(double("store"))

      common_listing = PSFakeListing.new(
        id: 100,
        genres: [ "Electronic" ],
        styles: [ "House" ],
        condition: "VG+"
      )

      rare_style_listing = PSFakeListing.new(
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

    it "normalizes condition variants (NM, Near Mint, M-) to good condition" do
      selector = described_class.new(double("store"))
      conditions = %w[NM Near\ Mint M- VG+]
      conditions.each do |cond|
        listing = PSFakeListing.new(id: 200, genres: [ "Rock" ], styles: [ "Classic Rock" ], condition: cond)
        score = selector.send(:score, listing, { "Rock" => 10 }, { "Classic Rock" => 10 })
        expect(score).to be > 0, "expected #{cond.inspect} to count as good condition"
      end
    end

    it "penalizes records with no style, no genre diversity, and no year" do
      selector = described_class.new(double("store"))
      weak = PSFakeListing.new(id: 300, genres: [ "Rock" ], styles: [], condition: "Generic", year: nil)
      strong = PSFakeListing.new(id: 301, genres: [ "Rock" ], styles: [ "Classic Rock" ], year: 1975, condition: "VG+")

      genre_counts = { "Rock" => 10 }
      style_counts = { "Classic Rock" => 10 }

      weak_score = selector.send(:score, weak, genre_counts, style_counts)
      strong_score = selector.send(:score, strong, genre_counts, style_counts)

      expect(strong_score).to be > weak_score
    end

    it "boosts records where more people want than have (high want/have ratio)" do
      selector = described_class.new(double("store"))

      coveted = PSFakeListing.new(id: 400, genres: [ "Jazz" ], styles: [], condition: "VG+",
                                  want_count: 800, have_count: 300)
      common = PSFakeListing.new(id: 401, genres: [ "Jazz" ], styles: [], condition: "VG+",
                                 want_count: 100, have_count: 500)

      genre_counts = { "Jazz" => 5 }
      style_counts = {}

      coveted_score = selector.send(:score, coveted, genre_counts, style_counts)
      common_score  = selector.send(:score, common, genre_counts, style_counts)

      expect(coveted_score).to be > common_score
    end

    it "does not apply want/have scoring when have_count is nil" do
      selector = described_class.new(double("store"))

      listing = PSFakeListing.new(id: 500, genres: [ "Jazz" ], styles: [], condition: "VG+",
                                  want_count: nil, have_count: nil)

      expect { selector.send(:score, listing, {}, {}) }.not_to raise_error
    end
  end
end
