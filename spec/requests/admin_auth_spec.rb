require "rails_helper"

RSpec.describe "Admin authentication", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:password) { "correct-horse-battery-staple-123" }
  let!(:admin) { create(:admin_user, password:, password_confirmation: password) }

  describe "GET /admin — protected routes" do
    it "redirects to login when not authenticated" do
      get admin_path
      expect(response).to redirect_to(admin_login_path)
    end

    it "redirects to TOTP challenge when authenticated but TOTP not verified" do
      post admin_login_path, params: { session: { email: admin.email, password: } }

      # Login redirects to TOTP setup (TOTP not yet enabled)
      get admin_path
      expect(response).to redirect_to(admin_totp_path)
    end

    it "allows access when fully authenticated" do
      admin.generate_totp_secret!
      admin.admin_totp.update!(enabled: true)
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect! # to TOTP challenge

      code = ROTP::TOTP.new(admin.totp_secret, issuer: "Milkcrate").now
      post admin_totp_path, params: { code: }
      follow_redirect! # to admin dashboard

      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /admin/login" do
    it "authenticates with valid credentials" do
      post admin_login_path, params: { session: { email: admin.email, password: } }

      # TOTP not set up yet, so redirects to setup
      expect(response).to redirect_to(admin_totp_setup_path)
    end

    it "renders generic error for unknown email" do
      post admin_login_path, params: { session: { email: "unknown@example.com", password: } }

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Invalid email or password")
    end

    it "renders generic error for wrong password" do
      post admin_login_path, params: { session: { email: admin.email, password: "wrong-password" } }

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Invalid email or password")
    end

    it "renders generic error after a wrong password" do
      post admin_login_path, params: { session: { email: admin.email, password: "wrong-password" } }

      expect(response.body).to include("Invalid email or password")
    end

    it "renders lockout after max failed attempts" do
      AdminUser::MAX_ATTEMPTS.times do
        post admin_login_path, params: { session: { email: admin.email, password: "wrong-password" } }
      end

      expect(admin.reload.locked?).to be true

      # Even with correct password, login is blocked
      post admin_login_path, params: { session: { email: admin.email, password: } }
      expect(inertia.props[:errors][:email]).to include("Too many failed attempts. Try again later.")
    end

    it "redirects to TOTP challenge when TOTP is enabled" do
      admin.generate_totp_secret!
      admin.admin_totp.update!(enabled: true)

      post admin_login_path, params: { session: { email: admin.email, password: } }

      expect(response).to redirect_to(admin_totp_path)
    end

    it "resets failed attempts on successful login" do
      admin.update!(failed_login_attempts: 3, locked_at: nil)

      post admin_login_path, params: { session: { email: admin.email, password: } }

      expect(admin.reload.failed_login_attempts).to eq(0)
      expect(admin.reload.locked_at).to be_nil
    end
  end

  describe "TOTP challenge" do
    before do
      admin.generate_totp_secret!
      admin.admin_totp.update!(enabled: true)
    end

    it "denies access to /admin/totp without prior login" do
      get admin_totp_path
      expect(response).to redirect_to(admin_login_path)
    end

    it "renders TOTP challenge form after login" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("authentication code")
    end

    it "authenticates with a valid TOTP code" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      code = ROTP::TOTP.new(admin.totp_secret, issuer: "Milkcrate").now
      post admin_totp_path, params: { code: }

      expect(response).to redirect_to(admin_path)
    end

    it "rejects an invalid TOTP code" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      post admin_totp_path, params: { code: "000000" }

      expect(response.body).to include("Invalid code")
    end
  end

  describe "TOTP setup" do
    it "renders setup page with QR code when TOTP not enabled" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Set up two-factor")
      expect(response.body).to include("data:image/svg+xml;base64")
    end

    it "confirms setup with a valid code" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      admin.reload
      code = ROTP::TOTP.new(admin.totp_secret, issuer: "Milkcrate").now
      post admin_totp_setup_path, params: { code: }

      expect(response).to redirect_to(admin_path)
      expect(admin.admin_totp.reload.enabled).to be true
    end

    it "rejects confirmation with invalid code" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      post admin_totp_setup_path, params: { code: "000000" }

      expect(response.body).to include("Invalid code")
    end

    it "handles corrupted TOTP secret gracefully" do
      post admin_login_path, params: { session: { email: admin.email, password: } }
      follow_redirect!

      admin.admin_totp.update!(secret: "!!invalid-base32!!")
      post admin_totp_setup_path, params: { code: "000000" }

      expect(response.body).to include("Invalid code")
    end
  end

  describe "DELETE /admin/logout" do
    it "clears the session" do
      post admin_login_path, params: { session: { email: admin.email, password: } }

      delete admin_logout_path

      expect(response).to redirect_to(admin_login_path)

      get admin_path
      expect(response).to redirect_to(admin_login_path)
    end
  end

  describe "account lockout" do
    it "locks after max failed attempts" do
      AdminUser::MAX_ATTEMPTS.times do
        post admin_login_path, params: { session: { email: admin.email, password: "wrong-password" } }
      end

      expect(admin.reload.locked?).to be true

      post admin_login_path, params: { session: { email: admin.email, password: } }
      expect(response.body).to include("Too many failed attempts")
    end

    it "allows login after lockout period expires" do
      AdminUser::MAX_ATTEMPTS.times do
        post admin_login_path, params: { session: { email: admin.email, password: "wrong-password" } }
      end

      travel_to(AdminUser::LOCKOUT_PERIOD.from_now + 1.minute) do
        post admin_login_path, params: { session: { email: admin.email, password: } }
        expect(response).to redirect_to(admin_totp_setup_path)
      end
    end
  end
end
