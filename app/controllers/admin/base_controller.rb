# Base controller for admin routes with session-based authentication and TOTP 2FA.
class Admin::BaseController < ApplicationController
  before_action :require_admin_authentication

  private

  def current_admin
    @current_admin ||= AdminUser.find_by(id: session[:admin_id])
  end

  def require_admin_authentication
    unless current_admin
      redirect_to admin_login_path, alert: "Please sign in first."
      return
    end

    unless session[:totp_verified]
      redirect_to admin_totp_path, alert: "Complete two-factor authentication."
    end
  end
end
