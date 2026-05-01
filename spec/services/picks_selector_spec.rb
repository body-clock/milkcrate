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
      if attr.is_a?(String) && attr.include?("[")
        records.map { |r| r.genres.first }
      else
        records.map { |r| r.public_send(attr) }
      end
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

  describe "#score (via rank)" do
    def score_listing(listing, others: [])
      store    = fake_store(listings: [ listing ] + others)
      selector = described_class.new(store)
      selector.send(:score_all).find { |l, _| l == listing }&.last
    end

    it "boosts records with rare discovery styles" do
      common_style = fake_listing(id: 1, genres: [ "Electronic" ], styles: [ "House" ])
      rare_style   = fake_listing(id: 2, genres: [ "Electronic" ], styles: [ "Broken Beat" ])

      store    = fake_store(listings: [ common_style, rare_style ])
      selector = described_class.new(store)
      gc       = { "Electronic" => 6 }
      sc       = { "House" => 6, "Broken Beat" => 1 }

      common_score = selector.send(:score, common_style, gc, sc)
      rare_score   = selector.send(:score, rare_style, gc, sc)

      expect(rare_score).to be > common_score
    end

    it "normalizes condition variants (NM, Near Mint, M-) as good condition" do
      selector = described_class.new(fake_store(listings: []))
      %w[NM VG+ Near\ Mint M-].each do |cond|
        listing = fake_listing(genres: [ "Rock" ], styles: [ "Classic Rock" ], condition: cond)
        score   = selector.send(:score, listing, { "Rock" => 10 }, { "Classic Rock" => 10 })
        expect(score).to be > 0, "expected #{cond.inspect} to count as good condition"
      end
    end

    it "penalizes records with no style, no genre diversity, and no year" do
      selector = described_class.new(fake_store(listings: []))
      weak   = fake_listing(genres: [ "Rock" ], styles: [], year: nil, condition: "Generic")
      strong = fake_listing(genres: [ "Rock" ], styles: [ "Classic Rock" ], year: 1975, condition: "VG+")
      gc     = { "Rock" => 10 }
      sc     = { "Classic Rock" => 10 }

      expect(selector.send(:score, strong, gc, sc)).to be > selector.send(:score, weak, gc, sc)
    end

    it "boosts records with high want/have ratio above minimum have threshold" do
      selector = described_class.new(fake_store(listings: []))
      coveted = fake_listing(want_count: 800, have_count: 300, genres: [ "Jazz" ], styles: [])
      common  = fake_listing(want_count: 100, have_count: 500, genres: [ "Jazz" ], styles: [])
      gc      = { "Jazz" => 5 }

      expect(selector.send(:score, coveted, gc, {})).to be > selector.send(:score, common, gc, {})
    end

    it "boosts records with higher market depth at the same ratio" do
      selector = described_class.new(fake_store(listings: []))
      deep     = fake_listing(want_count: 500, have_count: 500, genres: [ "Jazz" ], styles: [])
      thin     = fake_listing(want_count: 1,   have_count: 1,   genres: [ "Jazz" ], styles: [])
      gc       = { "Jazz" => 5 }

      expect(selector.send(:score, deep, gc, {})).to be > selector.send(:score, thin, gc, {})
    end

    it "ignores want/have ratio when have_count is below minimum threshold" do
      selector = described_class.new(fake_store(listings: []))
      thin_market = fake_listing(want_count: 8, have_count: 3, genres: [ "Jazz" ], styles: [])

      expect { selector.send(:score, thin_market, {}, {}) }.not_to raise_error
    end

    it "penalizes records surfaced in the last 3 days" do
      selector = described_class.new(fake_store(listings: []))
      fresh   = fake_listing(genres: [ "Jazz" ], styles: [], last_surfaced_at: nil)
      stale   = fake_listing(genres: [ "Jazz" ], styles: [], last_surfaced_at: Date.today - 1)
      gc      = { "Jazz" => 5 }

      expect(selector.send(:score, fresh, gc, {})).to be > selector.send(:score, stale, gc, {})
    end

    it "gives a mild bonus to records not surfaced in 14+ days" do
      selector    = described_class.new(fake_store(listings: []))
      long_unseen = fake_listing(genres: [ "Jazz" ], styles: [], last_surfaced_at: Date.today - 20)
      recently    = fake_listing(genres: [ "Jazz" ], styles: [], last_surfaced_at: Date.today - 8)
      gc          = { "Jazz" => 5 }

      expect(selector.send(:score, long_unseen, gc, {})).to be > selector.send(:score, recently, gc, {})
    end

    it "gives the highest freshness bonus to never-surfaced records" do
      selector = described_class.new(fake_store(listings: []))
      never    = fake_listing(genres: [ "Jazz" ], styles: [], last_surfaced_at: nil)
      old      = fake_listing(genres: [ "Jazz" ], styles: [], last_surfaced_at: Date.today - 20)
      gc       = { "Jazz" => 5 }

      expect(selector.send(:freshness_score, never)).to be > selector.send(:freshness_score, old)
    end
  end
end
