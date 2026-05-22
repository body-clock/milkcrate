require "rails_helper"

RSpec.describe DiscogsClient do
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

    it "raises RateLimitError on 429" do
      stubs.get("/users/testuser/inventory") do
        [ 429, {}, "rate limited" ]
      end

      expect {
        client.seller_inventory("testuser")
      }.to raise_error(DiscogsClient::RateLimitError, /rate limit/)
    end

    it "raises ApiError on other error status" do
      stubs.get("/users/testuser/inventory") do
        [ 503, {}, "service unavailable" ]
      end

      expect {
        client.seller_inventory("testuser")
      }.to raise_error(DiscogsClient::ApiError, /503/)
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

  describe "OAuth client" do
    subject(:oauth_client) { described_class.new(connection: conn, access_token: "at", access_token_secret: "ats") }

    describe "#inventory_export" do
      it "raises ApiError when called without OAuth tokens" do
        expect { client.inventory_export }.to raise_error(DiscogsClient::ApiError, /OAuth access token required/)
      end
    end

    describe "#list_orders" do
      it "raises ApiError when called without OAuth tokens" do
        expect { client.list_orders }.to raise_error(DiscogsClient::ApiError, /OAuth access token required/)
      end
    end

    describe "#download_export" do
      it "raises ApiError when called without OAuth tokens" do
        expect { client.download_export(1) }.to raise_error(DiscogsClient::ApiError, /OAuth access token required/)
      end
    end
  end
end
