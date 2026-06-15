require "rails_helper"

RSpec.describe "Explore", type: :request do
  describe "GET /explore" do
    it "returns 200" do
      get "/explore"
      expect(response).to have_http_status(:ok)
    end

    it "renders the explore Inertia component" do
      get "/explore"
      expect(inertia).to render_component("explore")
    end

    it "returns an empty stores array when no stores exist" do
      get "/explore"
      expect(inertia.props[:stores]).to eq([])
    end

    it "returns only ready stores (synced and enriched)" do
      ready_store = create(:store, name: "Ready Store", discogs_username: "ready", last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)
      _unready_store = create(:store, name: "Unready Store", discogs_username: "unready", last_synced_at: nil, last_enriched_at: nil)

      get "/explore"

      names = inertia.props[:stores].map { |s| s[:name] }
      expect(names).to eq([ "Ready Store" ])
    end

    it "returns ready stores ordered by name" do
      create(:store, name: "Zulu Records", discogs_username: "zulu", total_listings: 200, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)
      create(:store, name: "Alpha Records", discogs_username: "alpha", total_listings: 150, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)
      create(:store, name: "Beta Music", discogs_username: "beta", total_listings: 300, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)

      get "/explore"

      names = inertia.props[:stores].map { |s| s[:name] }
      expect(names).to eq([ "Alpha Records", "Beta Music", "Zulu Records" ])
    end

    it "includes avatar_url, location, genre_tags, and description for each store" do
      store = create(:store, name: "Test Store", discogs_username: "teststore", total_listings: 42,
        avatar_url: "https://example.com/avatar.jpg", location: "Brooklyn, NY",
        genre_tags: [ "punk", "rock" ], description: "A cool store")

      get "/explore"

      expect(inertia.props[:stores]).to contain_exactly(
        a_hash_including(
          id: store.id,
          name: "Test Store",
          discogs_username: "teststore",
          total_listings: 42,
          avatar_url: "https://example.com/avatar.jpg",
          location: "Brooklyn, NY",
          genre_tags: [ "punk", "rock" ],
          description: "A cool store"
        )
      )
    end

    it "sets error to nil on success" do
      create(:store, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)
      get "/explore"
      expect(inertia.props[:error]).to be_nil
    end

    it "handles query errors gracefully" do
      allow(Store).to receive(:ready).and_raise(ActiveRecord::ConnectionNotEstablished)

      get "/explore"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("explore")
      expect(inertia.props[:error]).to be_present
      expect(inertia.props[:stores]).to eq([])
    end

    it "does not include sensitive store data in props" do
      create(:store, store_owner: create(:store_owner, discogs_username: "teststore"),
        last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)

      get "/explore"

      store_props = inertia.props[:stores].first
      expect(store_props.keys).to match_array(%w[id name discogs_username total_listings avatar_url location genre_tags description])
      expect(store_props.keys).not_to include("store_owner_id", "sync_status", "enrichment_status")
    end

    it "includes SEO metadata in the response" do
      get "/explore"

      expect(response.body).to include("<title>#{I18n.t('pages.seo.explore.title')}</title>")
      expect(response.body).to include('<meta name="description" content="')
      expect(response.body).to include('<link rel="canonical"')
    end

    describe "featured stores" do
      it "returns featured_stores prop" do
        get "/explore"
        expect(inertia.props).to have_key(:featured_stores)
      end

      it "returns up to 3 featured stores" do
        create_list(:store, 5, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)

        get "/explore"

        expect(inertia.props[:featured_stores].length).to be <= 3
      end

      it "returns empty array when no ready stores" do
        get "/explore"
        expect(inertia.props[:featured_stores]).to eq([])
      end
    end

    describe "featured records" do
      it "returns featured_records prop" do
        get "/explore"
        expect(inertia.props).to have_key(:featured_records)
      end

      it "returns an array" do
        get "/explore"
        expect(inertia.props[:featured_records]).to be_an(Array)
      end

      it "returns featured records with required keys when listings exist" do
        store = create(:store, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)
        create(:listing, store: store, format: "LP", cover_image_url: "https://example.com/cover.jpg",
          genres: ["Jazz"], listed_at: 1.month.ago, last_seen_at: 1.day.ago)

        get "/explore"

        records = inertia.props[:featured_records]
        expect(records.length).to be <= 24
        records.each do |record|
          expect(record).to include(:id, :title, :artist, :cover_image_url, :store_slug, :store_name)
        end
      end

      it "returns empty array when curation fails" do
        allow(CrossStoreWallCuration).to receive(:call).and_raise(StandardError)

        get "/explore"

        expect(inertia.props[:featured_records]).to eq([])
      end
    end

    describe "caching" do
      it "caches explore data" do
        create_list(:store, 3, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)

        expect(Rails.cache).to receive(:fetch).at_least(:once).and_call_original

        get "/explore"
        expect(response).to have_http_status(:ok)
      end

      it "returns consistent data on subsequent requests" do
        create_list(:store, 2, last_synced_at: 1.day.ago, last_enriched_at: 1.day.ago)

        get "/explore"
        first_names = inertia.props[:stores].map { |s| s[:name] }

        get "/explore"
        second_names = inertia.props[:stores].map { |s| s[:name] }

        expect(first_names).to eq(second_names)
      end
    end
  end
end
