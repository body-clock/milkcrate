require "spec_helper"
require "digest"
require "active_support/core_ext/date/calculations"
require "active_support/core_ext/numeric/time"


require_relative "../../app/services/picks_selector"

RSpec.describe PicksSelector do
  # Chainable fake scope — scope methods return self, filtering is passthrough
  # except where(id:) which filters by id for listing_ids tests
  PSFakeScope = Struct.new(:records) do
    def available = self
    def lp_only   = self

    def where(*args, **kwargs)
      if kwargs.key?(:id)
        ids = Array(kwargs[:id])
        self.class.new(records.select { |r| ids.include?(r.id) })
      else
        self
      end
    end

    def not(**_kwargs)
      self
    end

    def pluck(attr)
      records.map { |r| r.public_send(attr) }
    end

    def to_a = records
  end

  PSFakeListing = Struct.new(
    :id, :genres, :styles, :year, :condition,
    :want_count, :have_count, :last_surfaced_at,
    keyword_init: true
  ) do
    def primary_genre = genres.first
  end

  def fake_listing(overrides = {})
    PSFakeListing.new(
      id: rand(10_000),
      genres: [ "Jazz" ],
      styles: [],
      year: nil,
      condition: "VG",
      want_count: nil,
      have_count: nil,
      last_surfaced_at: nil,
      **overrides
    )
  end

  def fake_store(listings:)
    double("Store", listings: PSFakeScope.new(listings))
  end

  describe "#select_picks" do
    it "returns highest-scoring records" do
      high = fake_listing(id: 1, genres: [ "Jazz" ], styles: [ "Afro-Jazz" ], year: 1972, condition: "NM")
      low  = fake_listing(id: 2, genres: [ "Rock" ], styles: [], year: nil, condition: "Generic")

      result = described_class.new(fake_store(listings: [ high, low ])).select_picks(count: 12)

      expect(result).to include(high)
    end

    it "caps per-genre representation for diversity" do
      jazz_listings = Array.new(10) { |i| fake_listing(id: i, genres: [ "Jazz" ], styles: [ "Afro-Jazz" ], year: 1970, condition: "NM") }
      rock_listing  = fake_listing(id: 99, genres: [ "Rock" ], styles: [ "Psych" ], year: 1968, condition: "NM")

      result = described_class.new(fake_store(listings: jazz_listings + [ rock_listing ])).select_picks(count: 6)

      jazz_count = result.count { |l| l.primary_genre == "Jazz" }
      expect(jazz_count).to be <= 4
    end
  end

  describe "#rank" do
    it "returns listings sorted by score descending" do
      high = fake_listing(id: 1, genres: [ "Jazz" ], styles: [ "Afro-Jazz" ], year: 1972, condition: "NM")
      low  = fake_listing(id: 2, genres: [ "Rock" ], styles: [], year: nil, condition: "Generic")

      result = described_class.new(fake_store(listings: [ high, low ])).rank

      expect(result.first).to eq(high)
      expect(result.last).to eq(low)
    end

    it "filters to provided listing_ids" do
      included = fake_listing(id: 1, genres: [ "Jazz" ], styles: [ "Afro-Jazz" ], year: 1972, condition: "NM")
      excluded = fake_listing(id: 2, genres: [ "Rock" ], styles: [ "Classic Rock" ], year: 1975, condition: "VG+")

      result = described_class.new(fake_store(listings: [ included, excluded ])).rank(listing_ids: [ 1 ])

      expect(result.map(&:id)).to eq([ 1 ])
    end
  end
end
