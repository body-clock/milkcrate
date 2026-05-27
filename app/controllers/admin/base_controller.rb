# Base controller for admin routes with session-based authentication and TOTP 2FA.
class Admin::BaseController < ApplicationController
  before_action :require_admin_session
  before_action :require_totp_verification

  private

  def current_admin
    @current_admin ||= AdminUser.find_by(id: session[:admin_id])
  end

  def require_admin_session
    redirect_to admin_login_path, alert: "Please sign in first." unless current_admin
  end

  def require_totp_verification
    redirect_to admin_totp_path, alert: "Complete two-factor authentication." unless session[:totp_verified]
  end
end
