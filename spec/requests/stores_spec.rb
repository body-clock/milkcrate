require "rails_helper"

RSpec.describe "Stores", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  describe "GET /:slug" do
    context "with existing store" do
      let!(:store) { create(:store, discogs_username: "teststore") }

      before do
        curation = instance_double(StorefrontCuration, crates: [], storefront_sections: [])
        presenter_double = instance_double(CratePresenter,
          store_props: { id: store.id, name: store.name },
          build_crates: [],
          build_storefront_sections: []
        )
        allow(StorefrontCuration).to receive(:new).and_return(curation)
        allow(CratePresenter).to receive(:new).and_return(presenter_double)
      end

      it "returns 200" do
        get "/teststore"
        expect(response).to have_http_status(:ok)
      end

      it "renders inertia component" do
        get "/teststore"
        expect(response.body).to include("stores/featured")
      end

      it "sends Content-Security-Policy header on the storefront page" do
        get "/teststore"
        expect(response.headers["Content-Security-Policy"]).to be_present
      end

      it "includes script-src with nonce in the storefront CSP" do
        get "/teststore"
        csp = response.headers["Content-Security-Policy"]
        expect(csp).to include("script-src")
        expect(csp).to include("'nonce-")
      end
    end

    context "with unknown slug" do
      it "returns 200 and renders no_stores" do
        get "/unknownstore"
        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe "crate building integration" do
    let!(:store) { create(:store, discogs_username: "teststore") }
    let(:inertia_headers) { { "X-Inertia" => "true" } }

    def inertia_get(path)
      get path, headers: inertia_headers
      JSON.parse(response.body)
    end

    it "builds a genre bin for each primary genre present" do
      # Need enough records that genre crates survive after picks + featured (up to 100) dedup
      create_list(:listing, 100, store: store, genres: [ "Jazz" ], format: "LP")
      create_list(:listing, 100, store: store, genres: [ "Rock" ], format: "LP")

      crates = inertia_get("/teststore").dig("props", "crates")
      slugs = crates.map { |c| c["slug"] }
      expect(slugs).to include("picks", "jazz", "rock")
    end

    it "excludes records from a genre bin when that genre is not primary" do
      # Jazz primary, Rock secondary — should NOT appear in Rock bin
      jazz_primary = create(:listing, store: store, genres: [ "Jazz", "Rock" ], format: "LP")
      # Rock primary records — need enough that genre crate survives after picks + new_arrivals(50) + thematic(up to 50) dedup
      rock_listings = create_list(:listing, 200, store: store, genres: [ "Rock" ], format: "LP")

      crates = inertia_get("/teststore").dig("props", "crates")
      rock_crate = crates.find { |c| c["slug"] == "rock" }
      record_ids = rock_crate["records"].map { |r| r["id"] }

      # Jazz-primary record must never appear in Rock bin regardless of picks
      expect(record_ids).not_to include(jazz_primary.id)
    end

    it "caps each genre bin at 50 records" do
      # Need 200: picks(4) + new_arrivals(50) + thematic(50) + genre(50) = 154 consumed from pool
      create_list(:listing, 200, store: store, genres: [ "Jazz" ], format: "LP")

      crates = inertia_get("/teststore").dig("props", "crates")
      jazz_crate = crates.find { |c| c["slug"] == "jazz" }
      expect(jazz_crate["records"].size).to eq(50)
    end

    it "returns explicit storefront section semantics in payload order" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        create_list(:listing, 5, store: store, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], format: "LP", listed_at: 2.days.ago)
        create_list(:listing, 5, store: store, genres: [ "Rock" ], styles: [ "Indie Rock" ], format: "LP", listed_at: 3.days.ago)
        create_list(:listing, 5, store: store, genres: [ "Jazz" ], styles: [ "Bop" ], format: "LP", listed_at: 4.days.ago)

        payload = inertia_get("/teststore").dig("props", "storefront_sections")

        expect(payload.map { |section| section["key"] }).to include("picks_wall", "genre_grid")
        expect(payload.first["key"]).to eq("picks_wall")
        expect(payload.first.dig("crate", "slug")).to eq("picks")
      end
    end
  end
end
