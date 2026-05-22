require "rails_helper"

RSpec.describe DiscogsOauthClient do
  let(:consumer_key) { "test_key" }
  let(:consumer_secret) { "test_secret" }
  let(:consumer) { instance_double(OAuth::Consumer) }
  subject(:client) { described_class.new(consumer:) }

  describe "#request_token" do
    let(:request_token) { instance_double(OAuth::RequestToken, token: "rt", secret: "rs", authorize_url: "https://discogs.com/oauth/authorize?oauth_token=rt") }

    before do
      allow(consumer).to receive(:get_request_token).with(oauth_callback: "https://milkcrate.fm/auth/discogs/callback").and_return(request_token)
    end

    it "returns a request token and authorize url" do
      result = client.request_token(callback_url: "https://milkcrate.fm/auth/discogs/callback")
      expect(result.request_token).to eq(request_token)
      expect(result.authorize_url).to eq("https://discogs.com/oauth/authorize?oauth_token=rt")
    end

    context "when Discogs returns unauthorized" do
      before do
        allow(consumer).to receive(:get_request_token).and_raise(OAuth::Unauthorized)
      end

      it "raises an OauthError" do
        expect { client.request_token(callback_url: "https://milkcrate.fm/auth/discogs/callback") }
          .to raise_error(DiscogsOauthClient::OauthError, /request token failed/)
      end
    end
  end

  describe "#exchange_access_token" do
    let(:request_token) { instance_double(OAuth::RequestToken) }
    let(:access_token) { instance_double(OAuth::AccessToken, token: "at", secret: "ats") }

    before do
      allow(request_token).to receive(:get_access_token).with(oauth_verifier: "verifier123").and_return(access_token)
    end

    it "exchanges the verifier for an access token and secret" do
      result = client.exchange_access_token(request_token, "verifier123")
      expect(result.access_token).to eq("at")
      expect(result.access_token_secret).to eq("ats")
    end

    context "when Discogs returns unauthorized" do
      before do
        allow(request_token).to receive(:get_access_token).and_raise(OAuth::Unauthorized)
      end

      it "raises an OauthError" do
        expect { client.exchange_access_token(request_token, "verifier123") }
          .to raise_error(DiscogsOauthClient::OauthError, /access token exchange failed/)
      end
    end
  end

  describe "#verify_identity" do
    let(:access_token) { instance_double(OAuth::AccessToken) }
    let(:response) { instance_double(Net::HTTPResponse, code: "200", body: '{"username": "philadelphiamusic"}') }

    before do
      allow(OAuth::AccessToken).to receive(:new).with(consumer, "at", "ats").and_return(access_token)
      allow(access_token).to receive(:get).with("/oauth/identity").and_return(response)
    end

    it "returns the username from Discogs" do
      result = client.verify_identity("at", "ats")
      expect(result.username).to eq("philadelphiamusic")
    end

    context "when Discogs returns a non-200 response" do
      let(:response) { instance_double(Net::HTTPResponse, code: "401", body: "unauthorized") }

      it "raises an OauthError" do
        expect { client.verify_identity("at", "ats") }
          .to raise_error(DiscogsOauthClient::OauthError, /identity verification failed/)
      end
    end

    context "when the response body is not valid JSON" do
      let(:response) { instance_double(Net::HTTPResponse, code: "200", body: "not json") }

      it "raises an OauthError" do
        expect { client.verify_identity("at", "ats") }
          .to raise_error(DiscogsOauthClient::OauthError, /response parse failed/)
      end
    end
  end

  describe "#initialize" do
    context "without a consumer and without credentials configured" do
      subject(:client) { described_class.new }

      it "raises an OauthError" do
        allow(Rails.application.credentials).to receive(:dig).with(:discogs, :consumer_key).and_return(nil)
        allow(Rails.application.credentials).to receive(:dig).with(:discogs, :consumer_secret).and_return(nil)
        expect { client }.to raise_error(DiscogsOauthClient::OauthError, /consumer key is not configured/)
      end
    end
  end
end
