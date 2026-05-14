require "rails_helper"

RSpec.describe "Pages", type: :request do
  describe "GET /" do
    it "returns 200" do
      get "/"
      expect(response).to have_http_status(:ok)
    end

    it "renders the home Inertia page" do
      get "/"
      expect(response.body).to include("home")
    end

    it "does not render retired dig-session navigation" do
      get "/"

      expect(response.body).not_to include("Sessions")
      expect(response.body).not_to include("session-bar")
    end

    it "includes a preview prop in the Inertia response" do
      get "/"

      expect(response.body).to include("preview")
      expect(response.body).to include("store_name")
      expect(response.body).to include("sections")
    end

    it "renders successfully when no demo store exists" do
      # The test DB has no store matching Settings.discogs_username by default
      get "/"

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("home")
    end
  end

  describe "GET /apply" do
    it "returns 200" do
      get "/apply"
      expect(response).to have_http_status(:ok)
    end

    it "renders the apply Inertia page" do
      get "/apply"
      expect(response.body).to include("apply")
    end

    it "sends Content-Security-Policy header" do
      get "/apply"
      expect(response.headers["Content-Security-Policy"]).to be_present
    end

    it "includes script-src with nonce in the CSP" do
      get "/apply"
      csp = response.headers["Content-Security-Policy"]
      expect(csp).to include("script-src")
      expect(csp).to include("'nonce-")
    end

    it "includes Turnstile configuration for the apply form" do
      allow(TurnstileVerifier).to receive(:enabled?).and_return(true)
      allow(TurnstileVerifier).to receive(:site_key).and_return("site-key")

      get "/apply"

      expect(response.body).to include("turnstile")
      expect(response.body).to include("site-key")
    end

    it "renders without retired dig-session UI" do
      get "/apply"

      expect(response.body).not_to include("Sessions")
      expect(response.body).not_to include("session-bar")
    end
  end

  describe "branding regression" do
    it "does not include the milk emoji in the home page response" do
      get "/"

      # The emoji wordmark must not appear in the Inertia-rendered page
      expect(response.body).not_to include("🥛")
    end

    it "does not include the milk emoji in the apply page response" do
      get "/apply"

      expect(response.body).not_to include("🥛")
    end
  end
end
