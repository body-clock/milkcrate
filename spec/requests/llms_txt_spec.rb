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

    it "includes store links with descriptions" do
      get "/llms.txt"
      expect(response.body).to include("[Philadelphia Music](/philadelphiamusic)")
      expect(response.body).to include("[Super Micah](/supermicah)")
      expect(response.body).to include("[Browse all stores](/explore)")
    end

    it "includes the blockquote summary" do
      get "/llms.txt"
      expect(response.body).to include("> Browse vinyl records like a record store")
    end
  end

  describe "GET /llms-full.txt" do
    it "returns 200" do
      get "/llms-full.txt"
      expect(response).to have_http_status(:ok)
    end

    it "includes a reference to the explore directory" do
      get "/llms-full.txt"
      expect(response.body).to include("[the Explore directory](/explore)")
    end
  end
end
