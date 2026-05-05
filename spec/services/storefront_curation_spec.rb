require "rails_helper"

RSpec.describe StorefrontCuration do
  include ActiveSupport::Testing::TimeHelpers

  def lp_listing(store, overrides = {})
    create(:listing, store:, format: "LP", last_seen_at: Time.current, **overrides)
  end

  def curation_with_selector(store, picks:, rank_genre_map:)
    selector = instance_double(PicksSelector)
    allow(selector).to receive(:select_picks).with(count: 12).and_return(picks)
    allow(selector).to receive(:rank_genre) do |genre|
      rank_genre_map.fetch(genre, [])
    end
    allow(PicksSelector).to receive(:new).with(store).and_return(selector)
    described_class.new(store)
  end

  describe "#crates" do
    it "returns an array of curated crates" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])

      curation = described_class.new(store)
      expect(curation.crates).to all(be_a(StorefrontCuration::CuratedCrate))
    end

    it "returns picks crate with at most 12 records" do
      store = create(:store)
      15.times { |i| lp_listing(store, genres: [ "Genre#{i}" ]) }

      curation = described_class.new(store)
      picks_crate = curation.crates.find { |crate| crate.slug == "picks" }
      expect(picks_crate.listings.size).to be <= 12
    end

    it "returns only available LP listings in picks crate" do
      store = create(:store)
      lp_listing(store, genres: [ "Jazz" ])
      create(:listing, store:, format: "LP", last_seen_at: 10.days.ago, genres: [ "Rock" ])

      curation = described_class.new(store)
      picks_crate = curation.crates.find { |crate| crate.slug == "picks" }
      expect(picks_crate.listings.size).to eq(1)
    end

    it "does not surface listings missing from latest synced inventory" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store, last_synced_at: 2.hours.ago)
        fresh = lp_listing(store, genres: [ "Jazz" ], last_seen_at: 30.minutes.ago)
        create(:listing, store:, format: "LP", last_seen_at: 3.hours.ago, genres: [ "Rock" ])

        curation = described_class.new(store)
        picks_crate = curation.crates.find { |crate| crate.slug == "picks" }
        expect(picks_crate.listings).to include(fresh)
        expect(picks_crate.listings.size).to eq(1)
      end
    end

    it "adds genre crates after picks" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_selector(store, picks: [], rank_genre_map: { "Jazz" => [ listing ] })
      crates = curation.crates
      expect(crates.first.slug).to eq("picks")
      expect(crates.map(&:name)).to include("Jazz")
    end

    it "excludes records that appear in picks" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_selector(store, picks: [ listing ], rank_genre_map: { "Jazz" => [ listing ] })
      jazz_crate = curation.crates.find { |crate| crate.name == "Jazz" }
      expect(jazz_crate&.listings || []).not_to include(listing)
    end

    it "skips genres with no records remaining after picks exclusion" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_selector(store, picks: [ listing ], rank_genre_map: { "Jazz" => [ listing ] })
      expect(curation.crates.map(&:name)).not_to include("Jazz")
    end

    it "includes genres that have records not in picks" do
      store = create(:store)
      jazz1 = lp_listing(store, genres: [ "Jazz" ])
      jazz2 = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_selector(store, picks: [ jazz1 ], rank_genre_map: { "Jazz" => [ jazz1, jazz2 ] })
      jazz_crate = curation.crates.find { |crate| crate.name == "Jazz" }
      expect(jazz_crate).to be_present
      expect(jazz_crate.listings).to eq([ jazz2 ])
    end
  end

  describe "#surfaced_listings" do
    it "returns unique listings from all curated crates" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_selector(store, picks: [ listing ], rank_genre_map: { "Jazz" => [ listing ] })
      expect(curation.surfaced_listings).to eq([ listing ])
    end
  end
end
