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
  end
end
