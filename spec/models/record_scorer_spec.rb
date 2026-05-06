require "spec_helper"
require "active_support/core_ext/date/calculations"
require "active_support/core_ext/numeric/time"

require_relative "../../app/models/record_scorer"

RSpec.describe RecordScorer do
  ScorerFakeListing = Struct.new(
    :id, :genres, :styles, :year, :condition,
    :want_count, :have_count, :last_surfaced_at,
    keyword_init: true
  ) do
    def primary_genre = genres.first
  end

  def fake_listing(overrides = {})
    ScorerFakeListing.new(
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

  describe "#score" do
    it "normalizes condition variants as good condition" do
      scorer = described_class.new(genre_counts: { "Rock" => 10 }, today: Date.new(2026, 5, 5))

      %w[NM VG+ Near\ Mint M-].each do |condition|
        good = fake_listing(id: 1, genres: [ "Rock" ], styles: [ "Classic Rock" ], condition:)
        generic = fake_listing(id: 1, genres: [ "Rock" ], styles: [ "Classic Rock" ], condition: "Generic")

        expect(scorer.score(good)).to be > scorer.score(generic)
      end
    end

    it "penalizes records with no styles and no year" do
      scorer = described_class.new(genre_counts: { "Rock" => 10 }, today: Date.new(2026, 5, 5))
      weak = fake_listing(id: 1, genres: [ "Rock" ], styles: [], year: nil, condition: "Generic")
      strong = fake_listing(id: 1, genres: [ "Rock" ], styles: [ "Classic Rock" ], year: 1975, condition: "VG+")

      expect(scorer.score(strong)).to be > scorer.score(weak)
    end

    it "boosts vintage records" do
      scorer = described_class.new(genre_counts: { "Jazz" => 10 }, today: Date.new(2026, 5, 5))
      vintage = fake_listing(id: 1, genres: [ "Jazz" ], year: 1972)
      recent = fake_listing(id: 1, genres: [ "Jazz" ], year: 1985)

      expect(scorer.score(vintage)).to be > scorer.score(recent)
    end

    it "boosts records from small genre sections" do
      small_section_scorer = described_class.new(genre_counts: { "Jazz" => 4 }, today: Date.new(2026, 5, 5))
      large_section_scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      listing = fake_listing(id: 1, genres: [ "Jazz" ])

      expect(small_section_scorer.score(listing)).to be > large_section_scorer.score(listing)
    end

    it "boosts records with high want/have ratio above minimum have threshold" do
      scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      coveted = fake_listing(id: 1, want_count: 800, have_count: 300, genres: [ "Jazz" ])
      common = fake_listing(id: 1, want_count: 100, have_count: 500, genres: [ "Jazz" ])

      expect(scorer.score(coveted)).to be > scorer.score(common)
    end

    it "boosts records with higher market depth at the same ratio" do
      scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      deep = fake_listing(id: 1, want_count: 500, have_count: 500, genres: [ "Jazz" ])
      thin = fake_listing(id: 1, want_count: 1, have_count: 1, genres: [ "Jazz" ])

      expect(scorer.score(deep)).to be > scorer.score(thin)
    end

    it "ignores want/have ratio when have_count is below minimum threshold" do
      scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      thin_market = fake_listing(want_count: 8, have_count: 3, genres: [ "Jazz" ])

      expect { scorer.score(thin_market) }.not_to raise_error
    end

    it "penalizes records surfaced in the last 3 days" do
      scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      never_surfaced = fake_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: nil)
      recently_surfaced = fake_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 5, 4))

      expect(scorer.score(never_surfaced)).to be > scorer.score(recently_surfaced)
    end

    it "gives a mild bonus to records not surfaced in 14+ days" do
      scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      long_unseen = fake_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 4, 15))
      recently = fake_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 4, 27))

      expect(scorer.score(long_unseen)).to be > scorer.score(recently)
    end

    it "gives the highest freshness bonus to never-surfaced records" do
      scorer = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      never = fake_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: nil)
      old = fake_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 4, 15))

      expect(scorer.score(never)).to be > scorer.score(old)
    end

    it "adds deterministic daily variation" do
      listing = fake_listing(id: 1, genres: [ "Jazz" ])

      today_score = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5)).score(listing)
      same_day_score = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5)).score(listing)
      next_day_score = described_class.new(genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 6)).score(listing)

      expect(same_day_score).to eq(today_score)
      expect(next_day_score).not_to eq(today_score)
    end
  end
end
