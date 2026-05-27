# Development-only controller for impersonating stores during local development.
class DevController < ApplicationController
  before_action :ensure_development

  def login_as
    store = Store.find(params[:store_id])
    reset_session
    session[:store_owner_id] = store.store_owner_id
    redirect_to dashboard_path, notice: "Logged in as #{store.name}"
  end

  def admin_login
    admin = find_or_create_dev_admin
    admin.generate_totp_secret! unless admin.admin_totp
    admin.admin_totp.update!(enabled: true, last_used_at: nil)
    start_dev_session(admin)
  end

  private

  def start_dev_session(admin)
    reset_session
    session[:admin_id] = admin.id
    session[:totp_verified] = true
    redirect_to admin_path, notice: "Dev sign-in as #{admin.email}"
  end

  def find_or_create_dev_admin
    AdminUser.first || AdminUser.create!(
      email: "dev@milkcrate.fm",
      password: "dev-password-123",
      password_confirmation: "dev-password-123"
    )
  end

  def ensure_development
    raise "Not available in production" unless Rails.env.development?
  end
end
