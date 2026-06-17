require "rails_helper"

RSpec.describe CrossStoreWallCuration do
  let!(:ready_store) { create(:store, discogs_username: "coolstore", name: "Cool Store") }
  let!(:another_store) { create(:store, discogs_username: "jazzshop", name: "Jazz Shop") }

  def make_lp_listing(overrides = {})
    create(:listing, {
      store: ready_store,
      format: "LP",
      genres: [ "Jazz" ],
      cover_image_url: "https://example.com/cover.jpg",
      listed_at: 1.month.ago,
      last_seen_at: Time.current,
      last_surfaced_at: 1.day.ago
    }.merge(overrides))
  end

  describe ".call" do
    context "with eligible listings across stores" do
      before do
        make_lp_listing(store: ready_store, genres: [ "Jazz" ])
        make_lp_listing(store: another_store, genres: [ "Rock" ])
        make_lp_listing(store: ready_store, genres: [ "Soul" ])
      end

      it "returns records from multiple stores" do
        result = described_class.call(limit: 10)

        expect(result).to be_an(Array)
        expect(result.length).to be <= 10
        store_slugs = result.map { |r| r[:store_slug] }.uniq
        expect(store_slugs).to include("coolstore", "jazzshop")
      end

      it "serializes each record with required keys" do
        result = described_class.call(limit: 10)

        result.each do |record|
          expect(record).to include(
            :id, :title, :artist, :cover_image_url, :store_slug, :store_name
          )
        end
      end
    end

    context "with no ready stores" do
      before { Store.update_all(last_synced_at: nil, last_enriched_at: nil) }

      it "returns empty array" do
        result = described_class.call

        expect(result).to eq([])
      end
    end

    context "with listings without cover images" do
      before do
        make_lp_listing(cover_image_url: nil)
        make_lp_listing(cover_image_url: "https://example.com/cover.jpg")
      end

      it "excludes listings without cover images" do
        result = described_class.call(limit: 10)

        expect(result.length).to eq(1)
        expect(result.first[:cover_image_url]).to be_present
      end
    end

    context "with old listings" do
      before do
        make_lp_listing(listed_at: 2.years.ago)
        make_lp_listing(listed_at: 1.month.ago)
      end

      it "excludes listings older than 1 year" do
        result = described_class.call(limit: 10)

        expect(result.length).to eq(1)
      end
    end

    context "with genre diversity" do
      before do
        5.times { make_lp_listing(genres: [ "Jazz" ]) }
        5.times { make_lp_listing(genres: [ "Rock" ], store: another_store) }
      end

      it "applies genre diversity cap" do
        result = described_class.call(limit: 6)

        jazz_count = result.count { |r| r[:store_slug] == "coolstore" }
        rock_count = result.count { |r| r[:store_slug] == "jazzshop" }

        # Cap is max(count/3, 2) = max(2, 2) = 2 for limit=6
        expect(jazz_count).to be <= 2
        expect(rock_count).to be <= 2
      end
    end

    context "with store_slug matching discogs_username" do
      before { make_lp_listing }

      it "returns store_slug as discogs_username" do
        result = described_class.call(limit: 10)

        expect(result.first[:store_slug]).to eq("coolstore")
        expect(result.first[:store_name]).to eq("Cool Store")
      end
    end
  end
end
