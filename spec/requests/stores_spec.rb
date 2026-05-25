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
      let!(:store) { create(:store, discogs_username: "TestStore") }

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
      create_list(:listing, 100, store: store, genres: [ "Jazz" ], format: "LP")
      create_list(:listing, 100, store: store, genres: [ "Rock" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      slugs = crates.map { |c| c["slug"] }
      expect(slugs).to include("picks", "jazz", "rock")
    end

    it "excludes records from a genre bin when that genre is not primary" do
      jazz_primary = create(:listing, store: store, genres: [ "Jazz", "Rock" ], format: "LP")
      create_list(:listing, 200, store: store, genres: [ "Rock" ], format: "LP")

      get "/teststore"

      crates = inertia.props["crates"]
      rock_crate = crates.find { |c| c["slug"] == "rock" }
      rock_record_ids = rock_crate["records"].map { |r| r["id"] }

      expect(rock_record_ids).not_to include(jazz_primary.id)
    end

    it "caps each genre bin at 50 records" do
      create_list(:listing, 200, store: store, genres: [ "Jazz" ], format: "LP")

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
        expect(sections.map { |s| s["key"] }).to include("picks_wall", "genre_grid")
        expect(sections.first["key"]).to eq("picks_wall")
        expect(sections.first.dig("crate", "slug")).to eq("picks")
      end
    end
  end
end
