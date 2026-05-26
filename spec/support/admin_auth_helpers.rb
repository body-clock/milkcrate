module AdminAuthHelpers
  # Sign in as admin through the full login flow (password + TOTP).
  # This sets up the Rails session for subsequent requests.
  def sign_in_admin(admin = nil)
    admin ||= create(:admin_user, :with_totp)
    password = "test-admin-password-123"

    if admin.new_record?
      admin.password = password
      admin.password_confirmation = password
      admin.save!
    end

    post admin_login_path, params: { session: { email: admin.email, password: } }
    follow_redirect! # to TOTP challenge (or setup if TOTP not enabled)

    if admin.totp_enabled?
      code = ROTP::TOTP.new(admin.totp_secret, issuer: "Milkcrate").now
      post admin_totp_path, params: { code: }
      follow_redirect! # to admin dashboard
    else
      # Setup controller creates AdminTotp record during GET /admin/totp/setup,
      # so reload admin to pick up the generated secret
      admin.reload
      code = ROTP::TOTP.new(admin.totp_secret, issuer: "Milkcrate").now
      post admin_totp_setup_path, params: { code: }
      follow_redirect! # to admin dashboard
    end

    admin
  end


end

RSpec.configure do |config|
  config.include AdminAuthHelpers, type: :request
end
