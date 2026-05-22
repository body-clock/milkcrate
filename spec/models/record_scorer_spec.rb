require "rails_helper"

RSpec.describe RecordScorer do
  describe "#score" do
    it "normalizes condition variants as good condition" do
      scorer = build(:record_scorer, genre_counts: { "Rock" => 10 }, today: Date.new(2026, 5, 5))

      %w[NM VG+ Near\ Mint M-].each do |condition|
        listing_id = rand(1..10_000)
        good    = build_listing(id: listing_id, genres: [ "Rock" ], styles: [ "Classic Rock" ], condition:)
        generic = build_listing(id: listing_id, genres: [ "Rock" ], styles: [ "Classic Rock" ], condition: "Generic")

        expect(scorer.score(good)).to be > scorer.score(generic)
      end
    end

    it "penalizes records with no styles and no year" do
      scorer = build(:record_scorer, genre_counts: { "Rock" => 10 }, today: Date.new(2026, 5, 5))
      weak   = build_listing(id: 1, genres: [ "Rock" ], styles: [], year: nil, condition: "Generic")
      strong = build_listing(id: 1, genres: [ "Rock" ], styles: [ "Classic Rock" ], year: 1975, condition: "VG+")

      expect(scorer.score(strong)).to be > scorer.score(weak)
    end

    it "boosts vintage records" do
      scorer  = build(:record_scorer, genre_counts: { "Jazz" => 10 }, today: Date.new(2026, 5, 5))
      vintage = build_listing(id: 1, genres: [ "Jazz" ], year: 1972)
      recent  = build_listing(id: 1, genres: [ "Jazz" ], year: 1985)

      expect(scorer.score(vintage)).to be > scorer.score(recent)
    end

    it "boosts records with high want/have ratio above minimum have threshold" do
      scorer  = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      coveted = build_listing(id: 1, want_count: 800, have_count: 300, genres: [ "Jazz" ])
      common  = build_listing(id: 1, want_count: 100, have_count: 500, genres: [ "Jazz" ])

      expect(scorer.score(coveted)).to be > scorer.score(common)
    end

    it "boosts records with higher market depth at the same ratio" do
      scorer = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      deep   = build_listing(id: 1, want_count: 500, have_count: 500, genres: [ "Jazz" ])
      thin   = build_listing(id: 1, want_count: 1, have_count: 1, genres: [ "Jazz" ])

      expect(scorer.score(deep)).to be > scorer.score(thin)
    end

    it "ignores want/have ratio when have_count is below minimum threshold" do
      scorer      = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      thin_market = build_listing(want_count: 8, have_count: 3, genres: [ "Jazz" ])

      expect { scorer.score(thin_market) }.not_to raise_error
    end

    it "penalizes records surfaced in the last 3 days" do
      scorer           = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      never_surfaced   = build_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: nil)
      recently_surfaced = build_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 5, 4))

      expect(scorer.score(never_surfaced)).to be > scorer.score(recently_surfaced)
    end

    it "gives a mild bonus to records not surfaced in 14+ days" do
      scorer     = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      long_unseen = build_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 4, 15))
      recently    = build_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 4, 27))

      expect(scorer.score(long_unseen)).to be > scorer.score(recently)
    end

    it "gives the highest freshness bonus to never-surfaced records" do
      scorer = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
      never  = build_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: nil)
      old    = build_listing(id: 1, genres: [ "Jazz" ], last_surfaced_at: Date.new(2026, 4, 15))

      expect(scorer.score(never)).to be > scorer.score(old)
    end

    it "adds deterministic daily variation" do
      listing = build_stubbed(:listing, genres: [ "Jazz" ])

      today_score      = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5)).score(listing)
      same_day_score   = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5)).score(listing)
      next_day_score   = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 6)).score(listing)

      expect(same_day_score).to eq(today_score)
      expect(next_day_score).not_to eq(today_score)
    end

    describe "cover quality" do
      it "boosts listings with a distinct cover image" do
        scorer     = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
        good_cover = build_listing(id: 1, genres: [ "Jazz" ], cover_image_url: "https://example.com/cover.jpg", thumbnail_url: "https://example.com/thumb.jpg")
        thumb_only = build_listing(id: 1, genres: [ "Jazz" ], cover_image_url: "https://example.com/thumb.jpg", thumbnail_url: "https://example.com/thumb.jpg")

        expect(scorer.score(good_cover)).to be > scorer.score(thumb_only)
      end

      it "penalizes listings where cover equals thumbnail" do
        scorer  = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
        matched = build_listing(id: 1, genres: [ "Jazz" ], cover_image_url: "https://example.com/img.jpg", thumbnail_url: "https://example.com/img.jpg")
        none    = build_listing(id: 1, genres: [ "Jazz" ], cover_image_url: nil, thumbnail_url: nil)

        expect(scorer.score(none)).to be > scorer.score(matched)
      end

      it "penalizes listings missing a cover image" do
        scorer    = build(:record_scorer, genre_counts: { "Jazz" => 5 }, today: Date.new(2026, 5, 5))
        thumb_only = build_listing(id: 1, genres: [ "Jazz" ], cover_image_url: nil, thumbnail_url: "https://example.com/thumb.jpg")
        none       = build_listing(id: 1, genres: [ "Jazz" ], cover_image_url: nil, thumbnail_url: nil)

        expect(scorer.score(none)).to be > scorer.score(thumb_only)
      end
    end
  end

  describe "daily selection signals" do
    it "exposes good condition using the shared condition model" do
      scorer = build(:record_scorer, genre_counts: { "Rock" => 10 }, today: Date.new(2026, 5, 5))

      expect(scorer.good_condition?(build_listing(condition: "Near Mint"))).to be(true)
      expect(scorer.good_condition?(build_listing(condition: "Generic"))).to be(false)
    end

    it "exposes desirability using the shared want/have model" do
      scorer = build(:record_scorer, genre_counts: { "Jazz" => 10 }, today: Date.new(2026, 5, 5))

      expect(scorer.desirable?(build_listing(want_count: 800, have_count: 300, genres: [ "Jazz" ]))).to be(true)
      expect(scorer.desirable?(build_listing(want_count: 100, have_count: 500, genres: [ "Jazz" ]))).to be(false)
      expect(scorer.desirable?(build_listing(want_count: 0, have_count: 0, genres: [ "Jazz" ]))).to be(false)
    end
  end
end
