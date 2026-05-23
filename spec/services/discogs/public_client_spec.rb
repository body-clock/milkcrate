require "rails_helper"

RSpec.describe Discogs::PublicClient do
  let(:stubs) { Faraday::Adapter::Test::Stubs.new }
  let(:conn) do
    Faraday.new do |f|
      f.response :json
      f.adapter :test, stubs
    end
  end

  subject(:client) { described_class.new(connection: conn) }

  describe "#seller_inventory" do
    it "returns parsed body on 200" do
      stubs.get("/users/testuser/inventory") do
        [ 200, { "Content-Type" => "application/json" }, '{"listings":[],"pagination":{"pages":1}}' ]
      end

      result = client.seller_inventory("testuser")
      expect(result["listings"]).to eq([])
    end

    it "passes pagination params" do
      stubs.get("/users/testuser/inventory") do |env|
        expect(env.params["page"]).to eq("2")
        expect(env.params["per_page"]).to eq("100")
        expect(env.params["sort"]).to eq("listed")
        expect(env.params["sort_order"]).to eq("asc")
        [ 200, { "Content-Type" => "application/json" }, '{"listings":[]}' ]
      end

      client.seller_inventory("testuser", page: 2, sort_order: "asc")
    end

    it "raises RateLimitError on 429" do
      stubs.get("/users/testuser/inventory") do
        [ 429, {}, "rate limited" ]
      end

      expect {
        client.seller_inventory("testuser")
      }.to raise_error(Discogs::Errors::RateLimitError, /rate limit/)
    end

    it "raises ApiError on other error status" do
      stubs.get("/users/testuser/inventory") do
        [ 503, {}, "service unavailable" ]
      end

      expect {
        client.seller_inventory("testuser")
      }.to raise_error(Discogs::Errors::ApiError, /503/)
    end
  end

  describe "#release" do
    it "returns body and remaining rate limit count" do
      stubs.get("/releases/12345") do
        [ 200, { "Content-Type" => "application/json", "x-discogs-ratelimit-remaining" => "55" }, '{"id":12345}' ]
      end

      body, remaining = client.release("12345")
      expect(body["id"]).to eq(12345)
      expect(remaining).to eq(55)
    end
  end

  describe "#seller_inventory_pages" do
    it "returns total pages from pagination response" do
      stubs.get("/users/testuser/inventory") do
        [ 200, { "Content-Type" => "application/json" }, '{"listings":[],"pagination":{"pages":5}}' ]
      end

      expect(client.seller_inventory_pages("testuser")).to eq(5)
    end

    it "returns 1 when pagination lacks pages" do
      stubs.get("/users/testuser/inventory") do
        [ 200, { "Content-Type" => "application/json" }, '{"listings":[]}' ]
      end

      expect(client.seller_inventory_pages("testuser")).to eq(1)
    end
  end

  describe "#seller_profile" do
    it "returns parsed profile data" do
      stubs.get("/users/testuser") do
        [ 200, { "Content-Type" => "application/json" }, '{"username":"testuser","rank":42}' ]
      end

      result = client.seller_profile("testuser")
      expect(result["username"]).to eq("testuser")
    end
  end
end
