require "rails_helper"

RSpec.describe ShopperAuthCallbackService do
  subject(:service) do
    described_class.new(
      store_slug: "test-store",
      request_token: "request_token_val",
      request_token_secret: "request_token_secret_val",
      oauth_verifier: "verifier123"
    )
  end

  let(:oauth_client) { instance_double(DiscogsOauthClient) }
  let(:oauth_consumer) { instance_double(OAuth::Consumer) }
  let(:mock_request_token) { instance_double(OAuth::RequestToken, token: "request_token_val", secret: "request_token_secret_val") }
  let(:token_result) do
    instance_double(
      DiscogsOauthClient::AccessTokenResult,
      access_token: "access_token_val",
      access_token_secret: "access_token_secret_val"
    )
  end
  let(:identity_result) do
    instance_double(
      DiscogsOauthClient::IdentityResult,
      username: "shopper_user"
    )
  end

  before do
    allow(DiscogsOauthConsumer).to receive(:build).and_return(oauth_consumer)
    allow(OAuth::RequestToken).to receive(:new).with(oauth_consumer, "request_token_val", "request_token_secret_val")
      .and_return(mock_request_token)
    allow(DiscogsOauthClient).to receive(:new).and_return(oauth_client)
    allow(oauth_client).to receive(:exchange_access_token).and_return(token_result)
    allow(oauth_client).to receive(:verify_identity).and_return(identity_result)
  end

  describe "#call" do
    context "when OAuth exchange and identity verification succeed" do
      it "creates a new DiscogsShopper record" do
        expect { service.call }
          .to change(DiscogsShopper, :count).by(1)

        shopper = DiscogsShopper.last
        expect(shopper.discogs_username).to eq("shopper_user")
        expect(shopper.oauth_token).to eq("access_token_val")
        expect(shopper.oauth_token_secret).to eq("access_token_secret_val")
        expect(shopper.store_slug).to eq("test-store")
        expect(shopper.last_used_at).to be_present
      end

      it "returns a successful result with the shopper" do
        result = service.call

        expect(result).to be_success
        expect(result.shopper).to be_a(DiscogsShopper)
        expect(result.shopper.discogs_username).to eq("shopper_user")
      end

      it "passes the request token and verifier to the OAuth client" do
        expect(oauth_client).to receive(:exchange_access_token) do |request_token, verifier|
          expect(request_token).to be(mock_request_token)
          expect(verifier).to eq("verifier123")
          token_result
        end

        service.call
      end
    end

    context "when the shopper already exists" do
      let!(:existing_shopper) { create(:discogs_shopper, discogs_username: "shopper_user", oauth_token: "old_token") }

      it "updates the existing record instead of creating a duplicate" do
        expect { service.call }
          .not_to change(DiscogsShopper, :count)

        expect(existing_shopper.reload.oauth_token).to eq("access_token_val")
        expect(existing_shopper.oauth_token_secret).to eq("access_token_secret_val")
      end
    end

    context "when OAuth exchange fails" do
      before do
        allow(oauth_client).to receive(:exchange_access_token)
          .and_raise(DiscogsOauthClient::OauthError.new("Invalid verifier"))
      end

      it "returns an error result" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to eq("Authorization failed: Invalid verifier")
      end
    end

    context "when identity verification fails" do
      before do
        allow(oauth_client).to receive(:verify_identity)
          .and_raise(DiscogsOauthClient::OauthError.new("Identity mismatch"))
      end

      it "returns an error result" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to eq("Authorization failed: Identity mismatch")
      end
    end
  end
end
