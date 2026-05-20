require "rails_helper"

RSpec.describe Experiments::SeedGenerator do
  describe ".call" do
    it "generates records across 4 bands with expected schema" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)

      # Hot: vintage NM with high desirability
      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "hot-#{i}",
          artist: "Artist #{i}", year: 1972, genres: [ "Jazz" ], styles: [ "Bebop" ],
          condition: "Near Mint", want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      # Warm: VG+ with moderate desirability
      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "warm-#{i}",
          artist: "Warm #{i}", year: 1985, genres: [ "Rock" ],
          condition: "VG+", want_count: 20, have_count: 40,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg",
          last_surfaced_at: 4.days.ago)
      end

      # Cold: low metadata, recently surfaced, cover=thumbnail
      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "cold-#{i}",
          artist: "Cold #{i}", year: nil, genres: [ "Rock" ], styles: [],
          condition: "Generic", want_count: 0, have_count: 0,
          cover_image_url: "https://example.com/thumb.jpg", thumbnail_url: "https://example.com/thumb.jpg",
          last_surfaced_at: 1.day.ago)
      end

      # Lukewarm: even worse — recently surfaced, no cover at all
      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "luke-#{i}",
          artist: "Luke #{i}", year: nil, genres: [ "Rock" ], styles: [],
          condition: "Generic", want_count: 0, have_count: 0,
          cover_image_url: nil, thumbnail_url: "https://example.com/thumb.jpg",
          last_surfaced_at: 1.day.ago)
      end

      result = described_class.call(store_id: store.id, crate_name: "test-crate")

      expect(result.total_records).to be_between(20, 42)
      expect(result.band_counts.values.sum).to eq(result.total_records)
      result.seed_data.each do |entry|
        expect(entry.keys).to include(:position, :artist, :title, :cover_image_url, :band, :algorithm_score, :is_duplicate_of)
        expect(%i[hot warm cold lukewarm]).to include(entry[:band])
      end
    end

    it "fills what's available when a band has fewer listings than requested" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)

      3.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "hot-#{i}",
          year: 1972, genres: [ "Jazz" ], condition: "Near Mint",
          want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "other-#{i}",
          year: nil, genres: [ "Rock" ], styles: [], condition: "Generic",
          want_count: 0, have_count: 0,
          cover_image_url: nil, thumbnail_url: "https://example.com/thumb.jpg",
          last_surfaced_at: 1.day.ago)
      end

      result = described_class.call(store_id: store.id, crate_name: "test-crate")
      expect(result.band_counts[:hot]).to be <= 3
    end

    it "injects duplicate listings when matching discogs_release_id exists" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)

      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "dup-rel",
        artist: "Original", year: 1972, genres: [ "Jazz" ], condition: "Near Mint",
        want_count: 100, have_count: 10,
        cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "dup-rel",
        artist: "Duplicate", year: 1972, genres: [ "Jazz" ], condition: "VG+",
        want_count: 100, have_count: 10,
        cover_image_url: "https://example.com/c2.jpg", thumbnail_url: "https://example.com/t2.jpg")

      # Fill hot band so one dup listing stays in the pool but the other
      # doesn't get sampled — creating a duplicate candidate.
      18.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "hotfill-#{i}",
          year: 1972, genres: [ "Jazz" ], condition: "Near Mint",
          want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      # Fill cold/lukewarm bands with low-scoring records
      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "fill-#{i}",
          year: nil, genres: [ "Rock" ], styles: [], condition: "Generic",
          want_count: 0, have_count: 0,
          cover_image_url: nil, thumbnail_url: "https://example.com/thumb.jpg",
          last_surfaced_at: 1.day.ago)
      end
      # Fill warm band
      14.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "fill2-#{i}",
          year: 1985, genres: [ "Rock" ], condition: "VG+",
          want_count: 20, have_count: 40,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg",
          last_surfaced_at: 4.days.ago)
      end

      result = described_class.call(store_id: store.id, crate_name: "test-crate")
      dups = result.seed_data.select { |e| e[:is_duplicate_of] }
      expect(dups).not_to be_empty
    end

    it "raises Error when store has no LP listings" do
      empty_store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)
      expect {
        described_class.call(store_id: empty_store.id, crate_name: "empty")
      }.to raise_error(Experiments::SeedGenerator::Error, /No LP listings/)
    end
  end
end
