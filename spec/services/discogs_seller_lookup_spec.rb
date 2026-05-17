require "rails_helper"

RSpec.describe DiscogsSellerLookup do
  subject(:lookup) { described_class.new(username, client: client, cache: cache) }

  let(:client) { instance_double(DiscogsClient) }
  let(:cache) { ActiveSupport::Cache::MemoryStore.new }

  describe "#call" do
    context "with a valid username that exists on Discogs" do
      let(:username) { "  RealSeller  " }

      before do
        allow(client).to receive(:seller_profile).with("realseller").and_return(
          { "name" => "Real Seller", "username" => "realseller", "avatar_url" => "https://example.com/avatar.jpg" }
        )
      end

      it "normalizes the username and returns seller info" do
        expect(lookup.call).to eq(
          found: true,
          seller_name: "Real Seller",
          avatar_url: "https://example.com/avatar.jpg"
        )
      end

      it "caches found results by normalized username" do
        expect(client).to receive(:seller_profile).with("realseller").once.and_return(
          { "name" => "Real Seller", "username" => "realseller", "avatar_url" => "https://example.com/avatar.jpg" }
        )

        2.times do
          expect(lookup.call[:found]).to be(true)
        end
      end
    end

    context "with invalid usernames" do
      before do
        allow(client).to receive(:seller_profile)
      end

      [
        "ab",
        "a" * 41,
        "bad!slug",
        "-badstart",
        "badend_",
        "admin"
      ].each do |invalid_username|
        it "rejects #{invalid_username.inspect}" do
          result = described_class.new(invalid_username, client: client, cache: cache).call

          expect(result).to eq(found: false, reason: "invalid_slug")
          expect(client).not_to have_received(:seller_profile)
        end
      end
    end

    context "when Discogs raises an upstream error" do
      let(:username) { "rate-limited" }

      before do
        allow(client).to receive(:seller_profile).with("rate-limited").and_raise(
          DiscogsClient::RateLimitError, "Discogs rate limit hit"
        )
      end

      it "returns an API error without caching the result" do
        2.times do
          expect(lookup.call).to eq(found: false, reason: "api_error")
        end

        expect(client).to have_received(:seller_profile).twice
      end
    end

    context "when Discogs raises a generic API error" do
      let(:username) { "nonexistent" }

      before do
        allow(client).to receive(:seller_profile).with("nonexistent").and_raise(
          DiscogsClient::ApiError, "Discogs API error: 404 - Not Found"
        )
      end

      it "returns an API error" do
        expect(lookup.call).to eq(found: false, reason: "api_error")
      end
    end

    context "when Faraday raises an upstream error" do
      let(:username) { "faraday-error" }

      before do
        allow(client).to receive(:seller_profile).with("faraday-error").and_raise(
          Faraday::ConnectionFailed, "connection failed"
        )
      end

      it "returns an API error" do
        expect(lookup.call).to eq(found: false, reason: "api_error")
      end
    end
  end
end
