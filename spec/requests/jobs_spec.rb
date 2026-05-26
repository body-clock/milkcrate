require "rails_helper"

RSpec.describe "Jobs dashboard", type: :request do
  describe "authentication" do
    it "redirects to admin login when not authenticated" do
      get "/jobs"

      expect(response).to redirect_to("/admin/login")
    end

    it "serves the jobs dashboard when authenticated" do
      admin = create(:admin_user, :with_totp)

      # Sign in fully (password + TOTP)
      post admin_login_path, params: { session: { email: admin.email, password: admin.password } }
      follow_redirect!

      code = ROTP::TOTP.new(admin.totp_secret, issuer: "Milkcrate").now
      post admin_totp_path, params: { code: }
      follow_redirect! # to admin dashboard

      get "/jobs"

      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("Sign in as admin")
    end
  end
end
