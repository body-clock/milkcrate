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

  def oauth_response(code:, body:, location: nil)
    response = instance_double("OAuthResponse", code: code, body: body)
    allow(response).to receive(:[]).and_return(nil)
    allow(response).to receive(:[]).with("Location").and_return(location)
    allow(response).to receive(:[]).with("location").and_return(location)
    response
  end

  describe "delegation shim" do
    it "delegates seller_inventory to PublicClient" do
      stubs.get("/users/testuser/inventory") do
        [ 200, { "Content-Type" => "application/json" }, '{"listings":[],"pagination":{"pages":1}}' ]
      end

      result = client.seller_inventory("testuser")
      expect(result["listings"]).to eq([])
    end

    it "delegates release to PublicClient" do
      stubs.get("/releases/12345") do
        [ 200, { "Content-Type" => "application/json", "x-discogs-ratelimit-remaining" => "55" }, '{"id":12345}' ]
      end

      body, remaining = client.release("12345")
      expect(body["id"]).to eq(12345)
      expect(remaining).to eq(55)
    end

    it "raises DiscogsClient::RateLimitError on 429" do
      stubs.get("/users/testuser/inventory") do
        [ 429, {}, "rate limited" ]
      end

      expect {
        client.seller_inventory("testuser")
      }.to raise_error(DiscogsClient::RateLimitError, /rate limit/)
    end

    it "raises DiscogsClient::ApiError on other error status" do
      stubs.get("/users/testuser/inventory") do
        [ 503, {}, "service unavailable" ]
      end

      expect {
        client.seller_inventory("testuser")
      }.to raise_error(DiscogsClient::ApiError, /503/)
    end

    it "DiscogsClient::RateLimitError is the same class as Discogs::Errors::RateLimitError" do
      expect(DiscogsClient::RateLimitError).to eq(Discogs::Errors::RateLimitError)
    end

    it "DiscogsClient::ApiError is the same class as Discogs::Errors::ApiError" do
      expect(DiscogsClient::ApiError).to eq(Discogs::Errors::ApiError)
    end
  end

  describe "OAuth delegation" do
    subject(:oauth_client) { described_class.new(connection: conn, access_token: "at", access_token_secret: "ats") }
    let(:marketplace) { instance_double(Discogs::Marketplace) }

    before do
      allow(Discogs::Marketplace).to receive(:new).and_return(marketplace)
    end

    describe "#inventory_export" do
      it "raises ApiError when called without OAuth tokens" do
        expect { client.inventory_export }.to raise_error(DiscogsClient::ApiError, /OAuth access token required/)
      end

      it "delegates to Marketplace when tokens are present" do
        allow(marketplace).to receive(:inventory_export).and_return({ "id" => 42 })

        expect(oauth_client.inventory_export).to eq({ "id" => 42 })
      end
    end

    describe "#check_export_status" do
      it "delegates to Marketplace" do
        allow(marketplace).to receive(:check_export_status).with(42).and_return({ "status" => "completed" })

        expect(oauth_client.check_export_status(42)).to eq({ "status" => "completed" })
      end
    end

    describe "#recent_exports" do
      it "delegates to Marketplace" do
        allow(marketplace).to receive(:recent_exports).and_return([ { "id" => 42 } ])

        expect(oauth_client.recent_exports).to eq([ { "id" => 42 } ])
      end
    end

    describe "#download_export" do
      it "delegates to Marketplace" do
        allow(marketplace).to receive(:download_export).with(42).and_return("csv data")

        expect(oauth_client.download_export(42)).to eq("csv data")
      end
    end

    describe "#list_orders" do
      it "raises ApiError when called without OAuth tokens" do
        expect { client.list_orders }.to raise_error(DiscogsClient::ApiError, /OAuth access token required/)
      end

      it "delegates to Marketplace" do
        allow(marketplace).to receive(:list_orders).and_return([])

        expect(oauth_client.list_orders).to eq([])
      end
    end
  end
end
