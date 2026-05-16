require "rails_helper"

RSpec.describe "Admin::Dashboard", type: :request do
  around do |example|
    ENV["ADMIN_HTTP_BASIC_USER"] = "admin"
    ENV["ADMIN_HTTP_BASIC_PASSWORD"] = "secret"
    example.run
  ensure
    ENV.delete("ADMIN_HTTP_BASIC_USER")
    ENV.delete("ADMIN_HTTP_BASIC_PASSWORD")
  end

  describe "GET /admin" do
    it "requires admin credentials" do
      get "/admin"

      expect(response).to have_http_status(:unauthorized)
    end

    it "fails closed when credentials are not configured" do
      ENV.delete("ADMIN_HTTP_BASIC_USER")
      ENV.delete("ADMIN_HTTP_BASIC_PASSWORD")

      get "/admin"

      expect(response).to have_http_status(:unauthorized)
    end

    it "renders the admin dashboard Inertia page" do
      get "/admin", headers: auth_headers("admin", "secret")

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("admin/dashboard")
    end

    it "passes active store and applicant props" do
      create(:store, name: "Live Store", discogs_username: "live-store")
      create(:waitlist, name: "Applicant Store", discogs_username: "applicant-store")

      get "/admin", headers: auth_headers("admin", "secret")

      expect(inertia.props[:active_stores].map { |store| store[:name] }).to include("Live Store")
      expect(inertia.props[:applicants].map { |applicant| applicant[:name] }).to include("Applicant Store")
    end
  end

  def auth_headers(username, password)
    credentials = Base64.strict_encode64("#{username}:#{password}")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end
end
