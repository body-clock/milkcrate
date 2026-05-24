require "rails_helper"

RSpec.describe AuthorizeShopperService do
  subject(:service) { described_class.new(store_slug: "test-store", callback_url: "http://example.com/callback") }

  describe "#call" do
    context "when OAuth request token succeeds" do
      let(:oauth_client) { instance_double(DiscogsOauthClient) }
      let(:request_token_result) do
        instance_double(
          DiscogsOauthClient::RequestTokenResult,
          authorize_url: "https://discogs.com/oauth/authorize?oauth_token=abc123",
          request_token: instance_double(OAuth::RequestToken, token: "abc123", secret: "secret456")
        )
      end

      before do
        allow(DiscogsOauthClient).to receive(:new).and_return(oauth_client)
        allow(oauth_client).to receive(:request_token).with(callback_url: "http://example.com/callback")
          .and_return(request_token_result)
      end

      it "returns a successful result with authorize URL and tokens" do
        result = service.call

        expect(result).to be_success
        expect(result.authorize_url).to eq("https://discogs.com/oauth/authorize?oauth_token=abc123")
        expect(result.request_token).to eq("abc123")
        expect(result.request_token_secret).to eq("secret456")
      end

      it "does not check seller inventory" do
        expect(DiscogsClient).not_to receive(:new)
        service.call
      end
    end

    context "when OAuth request token fails" do
      before do
        allow(DiscogsOauthClient).to receive_message_chain(:new, :request_token)
          .and_raise(DiscogsOauthClient::OauthError.new("Discogs is unavailable"))
      end

      it "returns an error result" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to eq("Discogs is unavailable")
        expect(result.authorize_url).to be_nil
      end
    end
  end
end
