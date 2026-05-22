require "rails_helper"

RSpec.shared_context "with sufficient inventory" do
  before do
    allow(discogs_client).to receive(:seller_inventory).with(slug, page: 1)
      .and_return({ "pagination" => { "items" => 500 } })
  end
end

RSpec.shared_context "with oauth request token" do
  before do
    allow(oauth_client).to receive(:request_token).with(any_args)
      .and_return(request_token_result)
  end
end

RSpec.shared_context "with oauth session" do
  before do
    allow_any_instance_of(AuthController).to receive(:session).and_return(
      ActiveSupport::HashWithIndifferentAccess.new(
        oauth_store_slug: slug,
        oauth_request_token: "req_token_123",
        oauth_request_token_secret: "req_secret_456"
      )
    )
  end
end

RSpec.describe "Discogs OAuth flow", type: :request do
  let(:slug) { "recordstore" }
  let(:discogs_client) { instance_double(DiscogsClient) }
  let(:oauth_client) { instance_double(DiscogsOauthClient) }
  let(:request_token) { instance_double(OAuth::RequestToken, token: "req_token_123", secret: "req_secret_456") }
  let(:request_token_result) {
    DiscogsOauthClient::RequestTokenResult.new(
      request_token:,
      authorize_url: "https://www.discogs.com/oauth/authorize?oauth_token=req_token_123"
    )
  }
  let(:access_token_result) {
    DiscogsOauthClient::AccessTokenResult.new(access_token: "at_123", access_token_secret: "ats_456")
  }
  let(:identity_result) { DiscogsOauthClient::IdentityResult.new(username: slug) }

  before do
    allow(DiscogsClient).to receive(:new).and_return(discogs_client)
    allow(DiscogsOauthClient).to receive(:new).and_return(oauth_client)
  end

  describe "POST /:slug/authorize" do
    context "when inventory >= 500" do
      include_context "with sufficient inventory"
      include_context "with oauth request token"

      it "redirects to Discogs authorization page" do
        post "/#{slug}/authorize"

        expect(response).to redirect_to(
          "https://www.discogs.com/oauth/authorize?oauth_token=req_token_123"
        )
      end
    end

    context "when inventory is 50" do
      before do
        allow(discogs_client).to receive(:seller_inventory).with(slug, page: 1)
          .and_return({ "pagination" => { "items" => 50 } })
      end

      it "redirects to store page with a 500-listing minimum message" do
        post "/#{slug}/authorize"

        expect(response).to redirect_to(store_path(slug))
        expect(flash[:alert]).to match(/at least 500/)
      end
    end

    context "when inventory is 0" do
      before do
        allow(discogs_client).to receive(:seller_inventory).with(slug, page: 1)
          .and_return({ "pagination" => { "items" => 0 } })
      end

      it "redirects to store page with a 500-listing minimum message" do
        post "/#{slug}/authorize"

        expect(response).to redirect_to(store_path(slug))
        expect(flash[:alert]).to match(/at least 500/)
      end
    end

    context "when Discogs API errors" do
      before do
        allow(discogs_client).to receive(:seller_inventory).with(slug, page: 1)
          .and_raise(DiscogsClient::ApiError, "API unavailable")
      end

      it "redirects with a verification-failure message" do
        post "/#{slug}/authorize"

        expect(response).to redirect_to(store_path(slug))
        expect(flash[:alert]).to match(/Could not verify/)
      end
    end

    context "when OAuth request token fails" do
      include_context "with sufficient inventory"

      before do
        allow(oauth_client).to receive(:request_token).with(any_args)
          .and_raise(DiscogsOauthClient::OauthError, "Discogs rejected the request")
      end

      it "redirects with the OAuth error message" do
        post "/#{slug}/authorize"

        expect(flash[:alert]).to match(/Discogs rejected/)
      end
    end
  end

  describe "GET /auth/discogs/callback" do
    context "when identity matches the slug" do
      include_context "with oauth session"

      before do
        allow(oauth_client).to receive(:exchange_access_token)
          .and_return(access_token_result)
        allow(oauth_client).to receive(:verify_identity)
          .and_return(identity_result)
        allow(discogs_client).to receive(:seller_profile).with(slug)
          .and_return({ "name" => "Record Store" })
      end

      it "stores the access token" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        store = Store.find_by!(discogs_username: slug)
        expect(store.discogs_oauth_token).to eq("at_123")
        expect(store.discogs_oauth_token_secret).to eq("ats_456")
      end

      it "marks the store as OAuth authorized" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        store = Store.find_by!(discogs_username: slug)
        expect(store).to be_oauth_authorized
      end

      it "sets sync source to CSV export" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        store = Store.find_by!(discogs_username: slug)
        expect(store.sync_source).to eq("csv_export")
      end

      it "redirects to the dashboard with a success notice" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        expect(response).to redirect_to(dashboard_path)
        expect(flash[:notice]).to match(/authorized/)
      end

      it "enqueues a CSV export sync job" do
        expect {
          get "/auth/discogs/callback", params: { oauth_verifier: "v1" }
        }.to have_enqueued_job(CsvExportSyncJob)
      end

      context "when the store already exists" do
        let!(:existing_store) { create(:store, discogs_username: slug) }

        it "upgrades the existing store instead of creating a new one" do
          expect {
            get "/auth/discogs/callback", params: { oauth_verifier: "v1" }
          }.not_to change(Store, :count)

          existing_store.reload
          expect(existing_store).to be_oauth_authorized
        end
      end
    end

    context "when identity does not match slug" do
      include_context "with oauth session"

      before do
        allow(oauth_client).to receive(:exchange_access_token)
          .and_return(access_token_result)
        allow(oauth_client).to receive(:verify_identity)
          .and_return(DiscogsOauthClient::IdentityResult.new(username: "different_user"))
      end

      it "does not create a store" do
        expect {
          get "/auth/discogs/callback", params: { oauth_verifier: "v1" }
        }.not_to change(Store, :count)
      end

      it "redirects with an identity mismatch message" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        expect(flash[:alert]).to match(/identity mismatch/)
      end
    end

    context "when OAuth token exchange fails" do
      include_context "with oauth session"

      before do
        allow(oauth_client).to receive(:exchange_access_token)
          .and_raise(DiscogsOauthClient::OauthError, "Invalid verifier")
      end

      it "redirects with the error message" do
        get "/auth/discogs/callback", params: { oauth_verifier: "bad" }

        expect(flash[:alert]).to match(/Invalid verifier/)
      end
    end

    context "when store creation fails" do
      include_context "with oauth session"

      before do
        allow(oauth_client).to receive(:exchange_access_token)
          .and_return(access_token_result)
        allow(oauth_client).to receive(:verify_identity)
          .and_return(identity_result)
        allow(discogs_client).to receive(:seller_profile).with(slug)
          .and_raise(DiscogsClient::ApiError, "Profile not found")
      end

      it "redirects with a store-creation error" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        expect(flash[:alert]).to match(/Could not create store/)
      end
    end

    context "with no OAuth session data" do
      it "redirects with a session-expired message" do
        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        expect(flash[:alert]).to match(/Session expired/)
      end
    end

    context "with session but no verifier" do
      include_context "with oauth session"

      it "redirects with a missing-code message" do
        get "/auth/discogs/callback"

        expect(flash[:alert]).to match(/Missing authorization code/)
      end
    end
  end
end
