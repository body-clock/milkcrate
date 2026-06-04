require "rails_helper"

RSpec.describe Discogs::Marketplace do
  def oauth_response(code:, body:, location: nil)
    response = instance_double("OAuthResponse", code: code, body: body)
    allow(response).to receive(:[]).and_return(nil)
    allow(response).to receive(:[]).with("Location").and_return(location)
    allow(response).to receive(:[]).with("location").and_return(location)
    response
  end

  subject(:client) { described_class.new(access_token: "at", access_token_secret: "ats") }
  let(:oauth_access_token) { instance_double(OAuth::AccessToken) }

  before do
    allow_any_instance_of(described_class).to receive(:oauth_access_token).and_return(oauth_access_token)
  end

  describe "#inventory_export" do
    it "returns an export id from a JSON body" do
      response = oauth_response(code: 200, body: '{"id":42}')
      allow(oauth_access_token).to receive(:post).and_return(response)

      expect(client.inventory_export).to eq({ "id" => 42 })
    end

    it "falls back to the Location header when the body is empty" do
      response = oauth_response(
        code: 202,
        body: "",
        location: "https://api.discogs.com/inventory/export/42"
      )
      allow(oauth_access_token).to receive(:post).and_return(response)

      expect(client.inventory_export).to eq({ "id" => 42 })
    end

    it "raises ApiError when no export id can be determined" do
      response = oauth_response(code: 500, body: "boom")
      allow(oauth_access_token).to receive(:post).and_return(response)

      expect { client.inventory_export }.to raise_error(Discogs::Errors::ApiError)
    end
  end

  describe "#check_export_status" do
    it "returns parsed status on 200" do
      response = oauth_response(code: 200, body: '{"status":"completed"}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect(client.check_export_status(42)).to eq({ "status" => "completed" })
    end

    it "normalizes 304 responses to not_modified" do
      response = oauth_response(code: 304, body: "")
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect(client.check_export_status(42)).to eq({ "status" => "not_modified" })
    end
  end

  describe "#download_export" do
    it "returns the response body on success" do
      response = oauth_response(code: 200, body: "csv,data")
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect(client.download_export(42)).to eq("csv,data")
    end

    it "raises ApiError on non-200 responses" do
      response = oauth_response(code: 500, body: "boom")
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect { client.download_export(42) }.to raise_error(Discogs::Errors::ApiError, /HTTP 500/)
    end
  end

  describe "#recent_exports" do
    it "returns an array of recent export hashes from body" do
      response = oauth_response(code: 200, body: '{"exports":[{"id":42}]}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect(client.recent_exports).to eq([ { "id" => 42 } ])
    end

    it "returns an empty array when no exports exist" do
      response = oauth_response(code: 200, body: "{}")
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect(client.recent_exports).to eq([])
    end
  end

  describe "#list_orders" do
    let(:default_params) do
      { "page" => "1", "per_page" => "50", "sort" => "last_activity", "sort_order" => "desc" }
    end

    it "includes page, per_page, sort, and sort_order in the request" do
      response = oauth_response(code: 200, body: '{"orders":[]}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      client.list_orders

      expect(oauth_access_token).to have_received(:get).with(
        a_string_matching(/page=1.*per_page=50.*sort=last_activity.*sort_order=desc/)
      )
    end

    it "includes status when provided" do
      response = oauth_response(code: 200, body: '{"orders":[]}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      client.list_orders(status: "New Order")

      expect(oauth_access_token).to have_received(:get).with(
        a_string_including("status=New+Order")
      )
    end

    it "URL-encodes status values with spaces" do
      response = oauth_response(code: 200, body: '{"orders":[]}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      client.list_orders(status: "New Order")

      expect(oauth_access_token).to have_received(:get).with(
        a_string_including("status=New+Order")
      )
    end

    it "accepts custom page, per_page, sort, and sort_order" do
      response = oauth_response(code: 200, body: '{"orders":[]}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      client.list_orders(page: 2, per_page: 100, sort: "created", sort_order: "asc")

      expect(oauth_access_token).to have_received(:get).with(
        a_string_matching(/page=2.*per_page=100.*sort=created.*sort_order=asc/)
      )
    end

    it "retries on 429 rate limit responses" do
      rate_limit_response = oauth_response(code: 429, body: "rate limited")
      success_response = oauth_response(code: 200, body: '{"orders":[]}')

      allow(oauth_access_token).to receive(:get).and_return(rate_limit_response, success_response)
      allow(client).to receive(:sleep)

      result = client.list_orders

      expect(result).to eq({ "orders" => [] })
      expect(oauth_access_token).to have_received(:get).twice
    end

    it "gives up after MAX_RETRIES on persistent 429" do
      rate_limit_response = oauth_response(code: 429, body: "rate limited")
      allow(oauth_access_token).to receive(:get).and_return(rate_limit_response)
      allow(client).to receive(:sleep)

      expect { client.list_orders }.to raise_error(Discogs::Errors::RateLimitError)
      expect(oauth_access_token).to have_received(:get).exactly(4).times
    end

    it "raises ApiError on non-2xx non-429 responses" do
      response = oauth_response(code: 500, body: "server error")
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect { client.list_orders }.to raise_error(Discogs::Errors::ApiError)
    end

    it "returns parsed orders on success" do
      response = oauth_response(code: 200, body: '{"orders":[]}')
      allow(oauth_access_token).to receive(:get).and_return(response)

      expect(client.list_orders).to eq({ "orders" => [] })
    end
  end
end
