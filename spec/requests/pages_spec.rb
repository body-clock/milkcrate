require "rails_helper"

RSpec.describe "Pages", type: :request do
  describe "GET /" do
    it "returns 200" do
      get "/"
      expect(response).to have_http_status(:ok)
    end

    it "renders the home Inertia component" do
      get "/"
      expect(inertia).to render_component("home")
    end

    it "renders the shopper-facing headline" do
      get "/"
      expect(inertia.props["copy"]["headline"]).to include("Browse Discogs like a record store")
    end

    it "does not include retired dig-session content in copy values" do
      get "/"

      inertia.props["copy"].each_value do |v|
        next unless v.is_a?(String)
        expect(v).not_to include("Sessions")
        expect(v).not_to include("session-bar")
      end
    end

    it "includes a preview prop with store_name and sections" do
      get "/"

      expect(inertia.props["preview"]["store_name"]).to be_a(String)
      expect(inertia.props["preview"]["sections"]).to be_an(Array)
    end

    it "renders successfully when no demo store exists" do
      get "/"

      expect(inertia).to render_component("home")
      expect(inertia.props["preview"]["sections"]).to eq([])
    end
  end

  describe "GET /apply" do
    it "returns 200" do
      get "/apply"
      expect(response).to have_http_status(:ok)
    end

    it "renders the apply Inertia component" do
      get "/apply"
      expect(inertia).to render_component("apply")
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

    it "includes Turnstile configuration in props" do
      allow(TurnstileVerifier).to receive(:enabled?).and_return(true)
      allow(TurnstileVerifier).to receive(:site_key).and_return("test-site-key")

      get "/apply"

      ts = inertia.props["turnstile"]
      expect(ts["enabled"]).to be true
      expect(ts["site_key"]).to eq("test-site-key")
    end
  end
end
