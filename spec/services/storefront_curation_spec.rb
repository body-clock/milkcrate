require "rails_helper"
require_relative "../support/storefront_curation_helpers"

RSpec.describe StorefrontCuration do
  include StorefrontCurationHelpers
  include ActiveSupport::Testing::TimeHelpers

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

  describe "#storefront_sections" do
    it "returns explicit sections in storefront order" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        picks = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ], listed_at: 10.days.ago)
        fresh = lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        themed = lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 5.days.ago)
        genre_only = lp_listings(store, count: 1, genres: [ "Rock" ], styles: [ "Indie Rock" ], listed_at: 9.days.ago)

        curation = curation_with_selector(
          store,
          picks: picks,
          rank_genre_map: {
            "Jazz" => picks,
            "Soul" => fresh,
            "Funk / Soul" => themed,
            "Rock" => genre_only
          }
        )

        sections = curation.storefront_sections

        expect(sections.map { |section| section[:key] }).to eq(%w[picks_wall featured_crates genre_grid])
        expect(section_crate(sections[0]).slug).to eq("picks")
        expect(section_crates(sections[1]).map(&:slug)).to eq(%w[new-arrivals thematic])
        expect(section_crates(sections[1]).first.listings).to eq(fresh)
        expect(section_crates(sections[2]).map(&:slug)).to eq([ "rock" ])
        expect(section_crates(sections[2]).first.listings).to eq(genre_only)
      end
    end

    it "dedupes top down across picks featured and genre sections" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        pick = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ], listed_at: 10.days.ago)
        fresh = lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        themed = lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 5.days.ago)
        genre = lp_listings(store, count: 1, genres: [ "Rock" ], styles: [ "Indie Rock" ], listed_at: 9.days.ago)

        curation = curation_with_selector(
          store,
          picks: pick,
          rank_genre_map: {
            "Jazz" => pick,
            "Soul" => fresh + pick,
            "Funk / Soul" => themed + fresh,
            "Rock" => genre + themed
          }
        )

        sections = curation.storefront_sections
        featured_records = section_crates(sections[1]).flat_map(&:listings)
        genre_records = section_crates(sections[2]).flat_map(&:listings)

        expect(featured_records).not_to include(pick)
        expect(genre_records).not_to include(pick, fresh, themed)
        expect(genre_records).to eq(genre)
      end
    end

    it "omits featured row when a featured crate underfills" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        pick = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ])
        fresh = lp_listings(store, count: 1, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        themed = lp_listings(store, count: 1, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 2.days.ago)
        genre = lp_listings(store, count: 1, genres: [ "Rock" ], styles: [ "Indie Rock" ])

        curation = curation_with_selector(
          store,
          picks: pick,
          rank_genre_map: {
            "Jazz" => pick,
            "Soul" => fresh,
            "Funk / Soul" => themed,
            "Rock" => genre
          }
        )

        sections = curation.storefront_sections

        expect(sections.map { |section| section[:key] }).to eq(%w[picks_wall genre_grid])
        expect(section_crates(sections.last).flat_map(&:listings)).to include(fresh.first, themed.first, genre.first)
      end
    end

    it "picks same thematic crate for same store and day" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        pick = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ], listed_at: 10.days.ago)
        lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 5.days.ago)
        lp_listings(store, count: 4, genres: [ "Electronic" ], styles: [ "House" ], listed_at: 6.days.ago)

        curation_a = curation_with_selector(store, picks: pick, rank_genre_map: {})
        curation_b = curation_with_selector(store, picks: pick, rank_genre_map: {})

        thematic_a = section_crates(curation_a.storefront_sections.find { |section| section[:key] == "featured_crates" }).last
        thematic_b = section_crates(curation_b.storefront_sections.find { |section| section[:key] == "featured_crates" }).last

        expect(thematic_a.name).to eq(thematic_b.name)
        expect(thematic_a.listings.map(&:id)).to eq(thematic_b.listings.map(&:id))
      end
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
