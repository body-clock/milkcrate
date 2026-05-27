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
      expect(curation.crates).to all(be_a(CuratedCrate))
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
      listings = lp_listings(store, count: 5, genres: [ "Jazz" ], styles: [ "Bop" ])

      curation = curation_with_strategies(store, picks: [], genre_scores: listings.each_with_index.to_h { |l, i| [ l.id, i + 1 ] })
      crates = curation.crates
      expect(crates.first.slug).to eq("picks")
      expect(crates.map(&:name)).to include("Jazz")
    end

    it "excludes records that appear in picks" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_strategies(store, picks: [ listing ], genre_scores: { listing.id => 10 })
      jazz_crate = curation.crates.find { |crate| crate.name == "Jazz" }
      expect(jazz_crate&.listings || []).not_to include(listing)
    end

    it "skips genres with no records remaining after picks exclusion" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_strategies(store, picks: [ listing ], genre_scores: { listing.id => 10 })
      expect(curation.crates.map(&:name)).not_to include("Jazz")
    end

    it "includes genres that have records not in picks" do
      store = create(:store)
      jazz1 = lp_listing(store, genres: [ "Jazz" ])
      jazz2 = lp_listing(store, genres: [ "Jazz" ])
      jazz3 = lp_listing(store, genres: [ "Jazz" ])
      jazz4 = lp_listing(store, genres: [ "Jazz" ])
      jazz5 = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_strategies(store, picks: [ jazz1 ], genre_scores: { jazz1.id => 5, jazz2.id => 10, jazz3.id => 9, jazz4.id => 8, jazz5.id => 7 })
      jazz_crate = curation.crates.find { |crate| crate.name == "Jazz" }
      expect(jazz_crate).to be_present
      expect(jazz_crate.listings).to eq([ jazz2, jazz3, jazz4, jazz5 ])
    end
  end

  describe "#storefront_groups" do
    it "includes a viable hidden gems crate in the featured group" do
      store = create(:store)
      gems = lp_listings(store, count: 4, genres: [ "Jazz" ], styles: [ "Rare Groove" ])
      curation = described_class.new(store)

      allow(curation).to receive(:picks_strategy)
        .and_return(instance_double(CrateStrategies::Picks, select: []))
      allow(curation).to receive(:new_arrivals_strategy)
        .and_return(instance_double(CrateStrategies::NewArrivals, select: []))
      allow(curation).to receive(:thematic_strategy)
        .and_return(instance_double(CrateStrategies::Thematic, select: nil))
      allow(curation).to receive(:hidden_gems_strategy)
        .and_return(instance_double(CrateStrategies::HiddenGems, select: gems))

      featured = curation.storefront_groups.fetch(:featured)

      expect(featured.map(&:slug)).to eq([ "hidden-gems" ])
      expect(featured.first.listings).to eq(gems)
    end

    it "returns grouped crates without storefront section keys" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        picks = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ], listed_at: 10.days.ago)
        fresh = lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        themed = lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 5.days.ago)
        genre_only = lp_listings(store, count: 4, genres: [ "Rock" ], styles: [ "Indie Rock" ], listed_at: 9.days.ago)

        all_listings = picks + fresh + themed + genre_only
        genre_scores = all_listings.each_with_index.to_h { |l, i| [ l.id, all_listings.size - i ] }

        na_crate = CuratedCrate.new(slug: "new-arrivals", name: "New Arrivals", listings: fresh)
        tm_crate = CuratedCrate.new(slug: "thematic", name: "Funk / Soul", listings: themed)

        curation = curation_with_strategies(
          store,
          picks:,
          genre_scores:,
          featured: [ na_crate, tm_crate ]
        )

        groups = curation.storefront_groups

        expect(groups.keys).to eq(%i[picks featured genres])
        expect(groups[:picks].slug).to eq("picks")
        expect(groups[:featured].map(&:slug)).to eq(%w[new-arrivals thematic])
        expect(groups[:featured].first.listings).to eq(fresh)
        expect(groups[:genres].map(&:slug)).to eq([ "rock" ])
        expect(groups[:genres].first.listings).to eq(genre_only)
      end
    end

    it "dedupes top down across picks featured and genre groups" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        pick = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ], listed_at: 10.days.ago)
        fresh = lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        themed = lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 5.days.ago)
        genre = lp_listings(store, count: 4, genres: [ "Rock" ], styles: [ "Indie Rock" ], listed_at: 9.days.ago)

        all_listings = pick + fresh + themed + genre
        genre_scores = all_listings.each_with_index.to_h { |l, i| [ l.id, all_listings.size - i ] }

        na_crate = CuratedCrate.new(slug: "new-arrivals", name: "New Arrivals", listings: fresh)
        tm_crate = CuratedCrate.new(slug: "thematic", name: "Funk / Soul", listings: themed)

        curation = curation_with_strategies(
          store,
          picks: pick,
          genre_scores:,
          featured: [ na_crate, tm_crate ]
        )

        groups = curation.storefront_groups
        featured_records = groups[:featured].flat_map(&:listings)
        genre_records = groups[:genres].flat_map(&:listings)

        expect(featured_records).not_to include(pick)
        expect(genre_records).not_to include(*pick, *fresh, *themed)
        expect(genre_records).to eq(genre)
      end
    end

    it "returns an empty featured group when a featured crate underfills" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        pick = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ])
        fresh = lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        themed = lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 2.days.ago)
        genre = lp_listings(store, count: 4, genres: [ "Rock" ], styles: [ "Indie Rock" ])

        all_listings = pick + fresh + themed + genre
        genre_scores = all_listings.each_with_index.to_h { |l, i| [ l.id, all_listings.size - i ] }

        curation = curation_with_strategies(
          store,
          picks: pick,
          genre_scores:,
          featured: [] # underfilled — featured row omitted
        )

        groups = curation.storefront_groups

        expect(groups[:featured]).to eq([])
        expect(groups[:genres].flat_map(&:listings)).to include(fresh.first, themed.first, genre.first)
      end
    end

    it "picks same thematic crate for same store and day" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        store = create(:store)
        pick = lp_listings(store, count: 1, genres: [ "Jazz" ], styles: [ "Bop" ], listed_at: 10.days.ago)
        lp_listings(store, count: 4, genres: [ "Soul" ], styles: [ "Deep Funk" ], listed_at: 1.day.ago)
        lp_listings(store, count: 4, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], listed_at: 5.days.ago)
        lp_listings(store, count: 4, genres: [ "Electronic" ], styles: [ "House" ], listed_at: 6.days.ago)

        curation_a = described_class.new(store)
        curation_b = described_class.new(store)

        groups_a = curation_a.storefront_groups
        groups_b = curation_b.storefront_groups

        thematic_a = groups_a[:featured].last
        thematic_b = groups_b[:featured].last

        if thematic_a && thematic_b
          expect(thematic_a.name).to eq(thematic_b.name)
          expect(thematic_a.listings.map(&:id)).to eq(thematic_b.listings.map(&:id))
        end
      end
    end
  end

  describe "#surfaced_listings" do
    it "returns unique listings from all curated crates" do
      store = create(:store)
      listing = lp_listing(store, genres: [ "Jazz" ])

      curation = curation_with_strategies(store, picks: [ listing ], genre_scores: { listing.id => 10 })
      expect(curation.surfaced_listings).to eq([ listing ])
    end
  end

  describe ".cached_curation" do
    let(:store) { create(:store) }
    let(:cache) { ActiveSupport::Cache::MemoryStore.new }

    before do
      6.times { |i| lp_listing(store, genres: [ "Jazz" ], styles: [ "Bop" ]) }
    end

    it "returns a hash with :sections and :crates keys" do
      result = described_class.cached_curation(store, cache: cache)

      expect(result).to be_a(Hash)
      expect(result.keys).to match_array(%i[sections crates])
      expect(result[:sections]).to be_an(Array)
      expect(result[:crates]).to be_an(Array)
    end

    it "sections contain expected keys" do
      result = described_class.cached_curation(store, cache: cache)

      first_section = result[:sections].first
      expect(first_section[:key]).to eq("picks_wall")
      expect(first_section[:crate]).to be_a(Hash)
      expect(first_section[:crate].keys).to include(:slug, :name, :count, :records)
    end

    it "on cache hit returns cached value without recomputing" do
      # Warm the cache
      first_result = described_class.cached_curation(store, cache: cache)

      # Second call should return cache hit
      expect(described_class).not_to receive(:new)
      expect(CratePresenter).not_to receive(:new)

      second_result = described_class.cached_curation(store, cache: cache)
      expect(second_result).to eq(first_result)
    end

    it "on cache miss computes curation and writes to cache" do
      cache.clear

      expect(described_class).to receive(:new).and_call_original.once
      expect(CratePresenter).to receive(:new).and_call_original.once

      result = described_class.cached_curation(store, cache: cache)
      expect(result[:sections]).to be_present
      expect(result[:crates]).to be_present
    end

    it "cache key includes store id, current date, and scope" do
      key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: Date.current.iso8601,
        scope: "available"
      }

      described_class.cached_curation(store, cache: cache)
      expect(cache.exist?(key)).to be true

      # Different date should result in a different (empty) cache
      other_key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: (Date.current + 1.day).iso8601,
        scope: "available"
      }
      expect(cache.exist?(other_key)).to be false
    end

    it "uses different cache keys for different filter_available scopes" do
      available_key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: Date.current.iso8601,
        scope: "available"
      }
      all_key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: Date.current.iso8601,
        scope: "all"
      }

      described_class.cached_curation(store, cache: cache)
      expect(cache.exist?(available_key)).to be true
      expect(cache.exist?(all_key)).to be false

      described_class.cached_curation(store, filter_available: false, cache: cache)
      expect(cache.exist?(all_key)).to be true
      expect(cache.exist?(available_key)).to be true  # still present from first call
    end

    it "returns sections and crates with matching data" do
      result = described_class.cached_curation(store, cache: cache)

      # Check that record IDs are consistent between sections and crates
      section_record_ids = result[:sections].flat_map { |s|
        if s[:crate]
          s[:crate][:records].map { |r| r[:id] }
        elsif s[:crates]
          s[:crates].flat_map { |c| c[:records].map { |r| r[:id] } }
        else
          []
        end
      }
      crate_record_ids = result[:crates].flat_map { |c| c[:records].map { |r| r[:id] } }

      expect(crate_record_ids).to include(*section_record_ids)
    end
  end

  describe ".write_curation_cache" do
    let(:store) { create(:store) }
    let(:cache) { ActiveSupport::Cache::MemoryStore.new }

    it "writes the payload to cache with the correct key including scope" do
      payload = { sections: [], crates: [] }
      key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: Date.current.iso8601,
        scope: "available"
      }

      described_class.write_curation_cache(store, payload, cache: cache)

      expect(cache.read(key)).to eq(payload)
    end

    it "writes to a different key when filter_available is false" do
      payload = { sections: [], crates: [] }
      available_key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: Date.current.iso8601,
        scope: "available"
      }
      all_key = StorefrontCuration::CacheManager::CURATION_CACHE_KEY % {
        store_id: store.id,
        date: Date.current.iso8601,
        scope: "all"
      }

      described_class.write_curation_cache(store, payload, filter_available: false, cache: cache)

      expect(cache.read(all_key)).to eq(payload)
      expect(cache.exist?(available_key)).to be false
    end

    it "does not raise with an empty payload" do
      expect {
        described_class.write_curation_cache(store, {}, cache: cache)
      }.not_to raise_error
    end
  end
end
