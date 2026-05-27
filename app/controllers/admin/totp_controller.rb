class Admin::TotpController < ApplicationController
  layout "inertia_application"

  before_action :require_admin_session
  before_action :redirect_if_totp_verified
  before_action :redirect_if_no_totp, only: [ :show ]

  def show
    render inertia: "admin/totp_challenge", props: {}
  end

  def create
    code = params[:code]&.strip

    if code.blank?
      render inertia: "admin/totp_challenge", props: { errors: { code: [ "Enter your authentication code" ] } }
      return
    end

    if current_admin.verify_totp!(code)
      establish_full_session!
      redirect_to admin_path, notice: "Signed in successfully."
    else
      render inertia: "admin/totp_challenge", props: { errors: { code: [ "Invalid code. Try again." ] } }
    end
  end

  def setup
    current_admin.generate_totp_secret! unless current_admin.totp_secret
    render inertia: "admin/totp_setup", props: totp_setup_props
  end

  def confirm_setup
    code = params[:code]&.strip

    if code.blank?
      render inertia: "admin/totp_setup", props: totp_setup_props.merge(
        errors: { code: [ "Enter the code from your authenticator app" ] }
      )
      return
    end

    if current_admin.verify_totp!(code)
      establish_full_session!
      redirect_to admin_path, notice: "Two-factor authentication is now active."
    else
      render inertia: "admin/totp_setup", props: totp_setup_props.merge(
        errors: { code: [ "Invalid code. Make sure your authenticator app is set up correctly." ] }
      )
    end
  end

  private

  def current_admin
    @current_admin ||= AdminUser.find_by(id: session[:admin_id])
  end

  def require_admin_session
    redirect_to admin_login_path, alert: "Please sign in first." unless current_admin
  end

  def redirect_if_totp_verified
    redirect_to admin_path if session[:totp_verified]
  end

  def redirect_if_no_totp
    redirect_to admin_totp_setup_path unless current_admin.totp_enabled?
  end

  def establish_full_session!
    reset_session
    session[:admin_id] = current_admin.id
    session[:totp_verified] = true
  end

  def totp_setup_props
    {
      qr_code: current_admin.totp_qr_code_data_uri,
      secret: current_admin.totp_secret,
      already_enabled: current_admin.totp_enabled?
    }
  end
end
