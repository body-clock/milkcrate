require "rails_helper"

RSpec.describe "Stores", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  describe "GET /:slug" do
    shared_examples "resolves store at slug" do |slug|
      it "returns 200 for /#{slug}" do
        get "/#{slug}"
        expect(response).to have_http_status(:ok)
      end

      it "renders the stores/show Inertia component for /#{slug}" do
        get "/#{slug}"
        expect(inertia).to render_component("stores/show")
      end
    end

    context "with existing store" do
      let!(:store) { create(:store, name: "Test Store", discogs_username: "TestStore") }

      include_examples "resolves store at slug", "teststore"
      include_examples "resolves store at slug", "TESTSTORE"

      before do
        allow(StorefrontCuration).to receive(:cached_curation).and_return({
          sections: [],
          crates: []
        })
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

      it "does not expose OAuth tokens in the storefront props" do
        store.update!(store_owner: create(:store_owner, discogs_username: "teststore"))

        get "/teststore"

        expect(inertia.props[:store].keys).not_to include("discogs_oauth_token", "discogs_oauth_token_secret")
      end

      it "exposes handoff_available in store props" do
        get "/teststore"

        expect(inertia.props[:store].keys).to include("handoff_available")
      end

      it "includes SEO metadata with store title, OG tags, and JSON-LD" do
        get "/teststore"

        expect(response.body).to include("<title>Test Store Vinyl Records")
        expect(response.body).to include('<meta name="description"')
        expect(response.body).to include('<meta property="og:title"')
        expect(response.body).to include('<meta property="og:description"')
        expect(response.body).to include('<meta name="twitter:card" content="summary_large_image">')
        expect(response.body).to include('<script type="application/ld+json">')
        expect(response.body).to include('"@type":"LocalBusiness"')
        expect(response.body).to include('<link rel="canonical"')
      end
    end

    context "with unknown slug" do
      it "returns 200 and renders invitation" do
        get "/unknownstore"
        expect(response).to have_http_status(:ok)
        expect(inertia).to render_component("stores/invitation")
      end

      it "passes slug as prop" do
        get "/some-slug"
        expect(inertia.props[:slug]).to eq("some-slug")
      end

      it "passes waitlist_present as false when no waitlist entry exists" do
        get "/slug-not-on-waitlist"
        expect(inertia.props[:waitlist_present]).to be false
      end

      it "passes waitlist_present as true when waitlist entry exists" do
        create(:waitlist, discogs_username: "applied-slug")
        get "/applied-slug"
        expect(inertia.props[:waitlist_present]).to be true
      end
    end
  end

  describe "crate building integration" do
    let!(:store) { create(:store, discogs_username: "teststore") }

    it "builds a genre bin for each primary genre present" do
      create_list(:listing, 100, store: store, genres: [ "Jazz" ], styles: [ "Bebop" ], format: "LP")
      create_list(:listing, 100, store: store, genres: [ "Rock" ], styles: [ "Classic Rock" ], format: "LP")
      create_list(:listing, 100, store: store, genres: [ "Electronic" ], styles: [ "House" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      slugs = crates.map { |c| c["slug"] }
      expect(slugs).to include("wall", "jazz", "rock")
    end

    it "excludes records from a genre bin when that genre is not primary" do
      jazz_primary = create(:listing, store: store, genres: [ "Jazz", "Rock" ], format: "LP")
      create_list(:listing, 100, store: store, genres: [ "Rock" ], styles: [ "Classic Rock" ], format: "LP")
      create_list(:listing, 50, store: store, genres: [ "Jazz" ], styles: [ "Bebop" ], format: "LP")
      create_list(:listing, 50, store: store, genres: [ "Electronic" ], styles: [ "House" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      rock_crate = crates.find { |c| c["slug"] == "rock" }
      rock_record_ids = rock_crate["records"].map { |r| r["id"] }

      expect(rock_record_ids).not_to include(jazz_primary.id)
    end

    it "caps each genre bin at 50 records" do
      # Leave at least 50 Jazz listings after wall and featured-crate deduplication.
      create_list(:listing, 200, store: store, genres: [ "Jazz" ], styles: [ "Bebop" ], format: "LP")
      create_list(:listing, 50, store: store, genres: [ "Rock" ], styles: [ "Classic Rock" ], format: "LP")
      create_list(:listing, 50, store: store, genres: [ "Electronic" ], styles: [ "House" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      jazz_crate = crates.find { |c| c["slug"] == "jazz" }
      expect(jazz_crate["records"].size).to eq(50)
    end

    it "returns explicit storefront section semantics in payload order" do
      travel_to(Time.zone.parse("2026-05-05 12:00:00")) do
        create_list(:listing, 5, store: store, genres: [ "Funk / Soul" ], styles: [ "Boogie" ], format: "LP", listed_at: 2.days.ago)
        create_list(:listing, 5, store: store, genres: [ "Rock" ], styles: [ "Indie Rock" ], format: "LP", listed_at: 3.days.ago)
        create_list(:listing, 5, store: store, genres: [ "Jazz" ], styles: [ "Bop" ], format: "LP", listed_at: 4.days.ago)

        get "/teststore"

        sections = inertia.props["storefront_sections"]
        expect(sections.map { |s| s["key"] }).to include("wall", "genre_grid")
        expect(sections.first["key"]).to eq("wall")
        expect(sections.first.dig("crate", "slug")).to eq("wall")
      end
    end

    context "with styles axis (narrow-catalog store)" do
      it "renders main style crate names and excludes rotation-tier styles from browse grid" do
        store = create(:store, discogs_username: "narrowstore")
        create_list(:listing, 50, store:, genres: [ "Rock" ], styles: [ "Punk" ], format: "LP")
        create_list(:listing, 40, store:, genres: [ "Rock" ], styles: [ "Hardcore" ], format: "LP")
        create_list(:listing, 4,  store:, genres: [ "Rock" ], styles: [ "Oi" ], format: "LP")
        create_list(:listing, 106, store:, genres: [ "Rock" ], styles: [ "Other" ], format: "LP")

        get "/narrowstore"

        genre_grid = inertia.props["storefront_sections"].find { |section| section["key"] == "genre_grid" }
        crate_names = genre_grid.fetch("crates").map { |crate| crate["name"] }

        # Main styles present in browse.
        expect(crate_names).to include("Punk", "Hardcore", "Other")
        # Oi 4 < 5% of 200 = 10 → rotation, not in browse grid.
        expect(crate_names).not_to include("Oi")
      end

      it "preserves serialized crate object shape" do
        store = create(:store, discogs_username: "crateshape")
        create_list(:listing, 20, store:, genres: [ "Rock" ], styles: [ "Punk" ], format: "LP")
        create_list(:listing, 80, store:, genres: [ "Rock" ], styles: [ "Other" ], format: "LP")

        get "/crateshape"

        crates = inertia.props["crates"]
        punk_crate = crates.find { |c| c["slug"] == "punk" }

        expect(punk_crate.keys).to include("slug", "name", "count", "records")
        expect(punk_crate["slug"]).to eq("punk")
        expect(punk_crate["count"]).to be_a(Integer)
        expect(punk_crate["records"]).to be_an(Array)
      end

      it "preserves section keys: wall, genre_grid" do
        store = create(:store, discogs_username: "sectionkeys")
        create_list(:listing, 10, store:, genres: [ "Rock" ], styles: [ "Punk" ], format: "LP")
        create_list(:listing, 90, store:, genres: [ "Rock" ], styles: [ "Other" ], format: "LP")

        get "/sectionkeys"

        sections = inertia.props["storefront_sections"]
        keys = sections.map { |s| s["key"] }
        expect(keys).to include("wall", "genre_grid")
      end

      it "keeps genre-axis behavior unchanged" do
        store = create(:store, discogs_username: "genrestore")
        create_list(:listing, 100, store:, genres: [ "Jazz" ], styles: [ "Bebop" ], format: "LP")
        create_list(:listing, 100, store:, genres: [ "Rock" ], styles: [ "Classic Rock" ], format: "LP")
        create_list(:listing, 100, store:, genres: [ "Electronic" ], styles: [ "House" ], format: "LP")

        get "/genrestore"

        crates = inertia.props["crates"]
        crate_names = crates.map { |c| c["name"] }

        # All three genres should have crates (genres axis, count-descending).
        expect(crate_names).to include("Jazz", "Rock", "Electronic")
      end
    end
  end
end
