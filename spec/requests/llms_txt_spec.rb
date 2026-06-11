require "rails_helper"

RSpec.describe "LLMs.txt", type: :request do
  describe "GET /llms.txt" do
    it "returns 200" do
      get "/llms.txt"
      expect(response).to have_http_status(:ok)
    end

    it "includes the site name as H1" do
      get "/llms.txt"
      expect(response.body).to include("# Milkcrate")
    end

    it "includes the blockquote summary" do
      get "/llms.txt"
      expect(response.body).to include("> Browse vinyl records like a record store")
    end

    it "lists stores from the database" do
      create(:store, name: "Alpha Records", discogs_username: "alpha", total_listings: 500)
      create(:store, name: "Beta Music", discogs_username: "beta", total_listings: 300)

      get "/llms.txt"

      expect(response.body).to include("[Alpha Records](http://www.example.com/alpha): 500+ vinyl records")
      expect(response.body).to include("[Beta Music](http://www.example.com/beta): 300+ vinyl records")
    end

    it "includes a link to browse all stores" do
      get "/llms.txt"
      expect(response.body).to include("[Browse all stores](/explore)")
    end

    it "limits to 20 stores" do
      create_list(:store, 25) do |store, i|
        store.update!(discogs_username: "store#{i}")
      end

      get "/llms.txt"

      # Should have at most 20 store entries plus the "Browse all" link
      store_links = response.body.scan(/\[.*?\]\(\/.*?\)/)
      expect(store_links.length).to be <= 21 # 20 stores + 1 browse link
    end
  end

  describe "GET /llms-full.txt" do
    it "returns 200" do
      get "/llms-full.txt"
      expect(response).to have_http_status(:ok)
    end

    it "lists all stores from the database" do
      create(:store, name: "Alpha Records", discogs_username: "alpha", total_listings: 500)
      create(:store, name: "Beta Music", discogs_username: "beta", total_listings: 300)

      get "/llms-full.txt"

      expect(response.body).to include("[Alpha Records](http://www.example.com/alpha)")
      expect(response.body).to include("[Beta Music](http://www.example.com/beta)")
    end
  end
end
