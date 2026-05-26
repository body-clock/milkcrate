require "rails_helper"

RSpec.describe "Admin::Dashboard", type: :request do
  describe "GET /admin" do
    it "redirects to login when not authenticated" do
      get "/admin"

      expect(response).to redirect_to(admin_login_path)
    end

    it "renders the admin dashboard Inertia page when authenticated" do
      sign_in_admin

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("admin/dashboard")
    end

    it "passes active store and applicant props" do
      create(:store, name: "Live Store", discogs_username: "live-store")
      create(:waitlist, name: "Applicant Store", discogs_username: "applicant-store")

      sign_in_admin

      expect(inertia.props[:active_stores].map { |store| store[:name] }).to include("Live Store")
      expect(inertia.props[:applicants].map { |applicant| applicant[:name] }).to include("Applicant Store")
    end
  end
end
