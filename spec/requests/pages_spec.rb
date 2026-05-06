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
end
