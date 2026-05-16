require "rails_helper"

RSpec.describe "DiscogsLookup", type: :request do
  describe "GET /api/discogs/lookup/:username" do
    let(:client) { instance_double(DiscogsClient) }

    before do
      allow(DiscogsClient).to receive(:new).and_return(client)
    end

    context "with a valid username that exists on Discogs" do
      before do
        allow(client).to receive(:seller_profile).with("realseller").and_return(
          { "name" => "Real Seller", "username" => "realseller", "avatar_url" => "https://example.com/avatar.jpg" }
        )
      end

      it "returns found: true with seller info" do
        get "/api/discogs/lookup/realseller"
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["found"]).to be true
        expect(body["seller_name"]).to eq("Real Seller")
        expect(body["avatar_url"]).to eq("https://example.com/avatar.jpg")
      end
    end

    context "with a username that doesn't exist on Discogs" do
      before do
        allow(client).to receive(:seller_profile).with("nonexistent").and_raise(
          DiscogsClient::ApiError, "Discogs API error: 404 — Not Found"
        )
      end

      it "returns found: false" do
        get "/api/discogs/lookup/nonexistent"
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["found"]).to be false
      end
    end

    context "when Discogs rate limits" do
      before do
        allow(client).to receive(:seller_profile).with("rate-limited").and_raise(
          DiscogsClient::RateLimitError, "Discogs rate limit hit"
        )
      end

      it "returns found: false with api_error reason" do
        get "/api/discogs/lookup/rate-limited"
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["found"]).to be false
        expect(body["reason"]).to eq("api_error")
      end
    end

    context "with an invalid slug" do
      it "rejects slugs shorter than 3 characters" do
        get "/api/discogs/lookup/ab"
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["found"]).to be false
        expect(body["reason"]).to eq("invalid_slug")
      end

      it "rejects slugs with invalid characters" do
        get "/api/discogs/lookup/bad!slug"
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["found"]).to be false
        expect(body["reason"]).to eq("invalid_slug")
      end

      it "rejects reserved slugs" do
        get "/api/discogs/lookup/admin"
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["found"]).to be false
        expect(body["reason"]).to eq("invalid_slug")
      end

      it "rejects slugs with leading/trailing special chars" do
        get "/api/discogs/lookup/-badstart"
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["found"]).to be false
        expect(body["reason"]).to eq("invalid_slug")
      end
    end

    context "caching" do
      around do |example|
        original_cache = Rails.cache
        Rails.cache = ActiveSupport::Cache::MemoryStore.new
        example.run
      ensure
        Rails.cache = original_cache
      end

      before do
        allow(client).to receive(:seller_profile).with("cached-user").and_return(
          { "name" => "Cached User", "username" => "cached-user" }
        )
      end

      it "caches found results and uses cache on subsequent requests" do
        expect(client).to receive(:seller_profile).once

        2.times do
          get "/api/discogs/lookup/cached-user"
          expect(response).to have_http_status(:ok)
          expect(response.parsed_body["found"]).to be true
        end
      end
    end
  end
end
