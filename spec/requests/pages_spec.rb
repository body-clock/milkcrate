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
  end
end
