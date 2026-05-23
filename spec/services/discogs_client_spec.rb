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
    let(:oauth_access_token) { instance_double(OAuth::AccessToken) }

    before do
      allow(oauth_client).to receive(:oauth_access_token).and_return(oauth_access_token)
    end

    describe "#inventory_export" do
      it "raises ApiError when called without OAuth tokens" do
        expect { client.inventory_export }.to raise_error(DiscogsClient::ApiError, /OAuth access token required/)
      end

      it "returns an export id from a JSON body" do
        response = oauth_response(code: 200, body: '{"id":42}')
        allow(oauth_access_token).to receive(:post).and_return(response)

        expect(oauth_client.inventory_export).to eq({ "id" => 42 })
      end

      it "falls back to the Location header when the body is empty" do
        response = oauth_response(
          code: 202,
          body: "",
          location: "https://api.discogs.com/inventory/export/42"
        )
        allow(oauth_access_token).to receive(:post).and_return(response)

        expect(oauth_client.inventory_export).to eq({ "id" => 42 })
      end
    end

    describe "#check_export_status" do
      it "normalizes 304 responses to not_modified" do
        response = oauth_response(code: 304, body: "")
        allow(oauth_access_token).to receive(:get).and_return(response)

        expect(oauth_client.check_export_status(42)).to eq({ "status" => "not_modified" })
      end
    end

    describe "#recent_exports" do
      it "returns an array of recent export hashes" do
        response = oauth_response(code: 200, body: '{"exports":{"id":42}}')
        allow(oauth_access_token).to receive(:get).and_return(response)

        expect(oauth_client.recent_exports).to eq([ { "id" => 42 } ])
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

      it "raises ApiError on non-200 responses" do
        response = oauth_response(code: 500, body: "boom")
        allow(oauth_access_token).to receive(:get).and_return(response)

        expect { oauth_client.download_export(1) }.to raise_error(DiscogsClient::ApiError, /HTTP 500/)
      end
    end
  end
end
