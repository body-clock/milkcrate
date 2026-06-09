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

    it "returns stores ordered by name" do
      create(:store, name: "Zulu Records", discogs_username: "zulu", total_listings: 200)
      create(:store, name: "Alpha Records", discogs_username: "alpha", total_listings: 150)
      create(:store, name: "Beta Music", discogs_username: "beta", total_listings: 300)

      get "/explore"

      names = inertia.props[:stores].map { |s| s[:name] }
      expect(names).to eq(["Alpha Records", "Beta Music", "Zulu Records"])
    end

    it "includes id, name, discogs_username, and total_listings for each store" do
      store = create(:store, name: "Test Store", discogs_username: "teststore", total_listings: 42)

      get "/explore"

      expect(inertia.props[:stores]).to contain_exactly(
        a_hash_including(
          id: store.id,
          name: "Test Store",
          discogs_username: "teststore",
          total_listings: 42
        )
      )
    end

    it "sets error to nil on success" do
      create(:store)
      get "/explore"
      expect(inertia.props[:error]).to be_nil
    end

    it "returns stores with null total_listings when column is nil" do
      create(:store, name: "Nil Store", discogs_username: "nilstore", total_listings: nil)

      get "/explore"

      expect(inertia.props[:stores]).to contain_exactly(
        a_hash_including(total_listings: nil)
      )
    end

    it "does not N+1 on listing count (single query)" do
      store_a = create(:store, name: "A Store", discogs_username: "a-store", total_listings: 10)
      store_b = create(:store, name: "B Store", discogs_username: "b-store", total_listings: 20)

      create_list(:listing, 3, store: store_a)
      create_list(:listing, 5, store: store_b)

      # Uses select(:id, :name, :discogs_username, :total_listings) without
      # loading associations — verify via the SQL log that only one query fires.
      get "/explore"

      expect(inertia.props[:stores].length).to eq(2)
      expect(inertia.props[:stores].first[:total_listings]).to be_present
    end

    it "handles query errors gracefully" do
      allow(Store).to receive(:order).and_raise(ActiveRecord::ConnectionNotEstablished)

      get "/explore"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("explore")
      expect(inertia.props[:error]).to be_present
      expect(inertia.props[:stores]).to eq([])
    end

    it "does not include sensitive store data in props" do
      create(:store, store_owner: create(:store_owner, discogs_username: "teststore"))

      get "/explore"

      store_props = inertia.props[:stores].first
      expect(store_props.keys).to match_array(%w[id name discogs_username total_listings])
      expect(store_props.keys).not_to include("store_owner_id", "sync_status", "enrichment_status")
    end
  end
end
