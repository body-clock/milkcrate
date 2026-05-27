require "rails_helper"

RSpec.describe Experiments::SeedGenerator do
  describe ".call" do
    it "generates top N scored records with expected schema" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)

      15.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "rel-#{i}",
          artist: "Artist #{i}", year: 1972, genres: [ "Jazz" ], styles: [ "Bebop" ],
          condition: "Near Mint", want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      result = described_class.call(store_id: store.id, crate_name: "test-crate")

      expect(result.total_records).to be <= Settings.experiments.crate_size
      expect(result.total_records).to be > 0
      expect(result.seed_data.size).to eq(result.total_records)

      result.seed_data.each do |entry|
        expect(entry).to have_key(:position)
        expect(entry).to have_key(:artist)
        expect(entry).to have_key(:title)
        expect(entry).to have_key(:algorithm_score)
        expect(entry).to have_key(:score_breakdown)
        expect(entry[:score_breakdown]).to be_a(Hash)
        expect(entry[:score_breakdown]).not_to be_empty
        expect(entry[:is_duplicate_of]).to be_nil
      end
    end

    it "sorts records by score descending" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)

      10.times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "rel-#{i}",
          artist: "Artist #{i}", year: 1972, genres: [ "Jazz" ],
          condition: "Near Mint", want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      result = described_class.call(store_id: store.id, crate_name: "test-crate")
      scores = result.seed_data.map { |e| e[:algorithm_score] }
      expect(scores).to eq(scores.sort.reverse)
    end

    it "does not report crate-size truncation as previously labeled exclusions" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)
      (Settings.experiments.crate_size + 1).times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "overflow-#{i}",
          artist: "Artist #{i}", year: 1972, genres: [ "Jazz" ], condition: "Near Mint",
          want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      allow_any_instance_of(described_class).to receive(:previously_labeled_ids).and_return([])

      result = described_class.call(store_id: store.id, crate_name: "test-crate")

      expect(result.total_records).to eq(Settings.experiments.crate_size)
      expect(result.excluded_count).to eq(0)
    end

    it "reports previously labeled release IDs as exclusions" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)
      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "labeled",
        cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "eligible",
        cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")

      allow_any_instance_of(described_class).to receive(:previously_labeled_ids).and_return([ "labeled" ])

      result = described_class.call(store_id: store.id, crate_name: "test-crate")

      expect(result.excluded_count).to eq(1)
      expect(result.seed_data.map { |entry| entry[:discogs_release_id] }).to eq([ "eligible" ])
    end

    it "raises Error when store has no LP listings" do
      empty_store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)
      expect {
        described_class.call(store_id: empty_store.id, crate_name: "empty")
      }.to raise_error(Experiments::SeedGenerator::Error, /No LP listings/)
    end
  end
end
