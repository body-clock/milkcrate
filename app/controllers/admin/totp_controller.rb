class Admin::TotpController < ApplicationController
  layout "inertia_application"

  before_action :require_admin_session
  before_action :redirect_if_totp_verified
  before_action :redirect_if_no_totp, only: [ :show ]

  def show
    render inertia: "admin/totp_challenge", props: {}
  end

  def create
    code = extract_code
    return render_totp_error(:challenge, "Enter your authentication code") if code.blank?
    return render_totp_error(:challenge, "Invalid code. Try again.") unless current_admin.verify_totp!(code)

    complete_authentication!("Signed in successfully.")
  end

  def setup
    current_admin.generate_totp_secret! unless current_admin.totp_secret
    render inertia: "admin/totp_setup", props: totp_setup_props
  end

  def confirm_setup
    code = extract_code
    return render_totp_error(:setup, "Enter the code from your authenticator app") if code.blank?
    return render_invalid_totp_setup unless current_admin.verify_totp!(code)

    complete_authentication!("Two-factor authentication is now active.")
  end

  def render_invalid_totp_setup
    render inertia: "admin/totp_setup", props: totp_setup_props.merge(
      errors: { code: [ "Invalid code. Make sure your authenticator app is set up correctly." ] }
    )
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

  def extract_code
    params[:code]&.strip
  end

  def render_totp_error(page, message)
    props = page == :challenge ? {} : totp_setup_props
    render inertia: "admin/totp_#{page}", props: props.merge(errors: { code: [ message ] })
  end

  def complete_authentication!(notice)
    reset_session
    session[:admin_id] = current_admin.id
    session[:totp_verified] = true
    redirect_to admin_path, notice:
  end

  def totp_setup_props
    {
      qr_code: current_admin.totp_qr_code_data_uri,
      secret: current_admin.totp_secret,
      already_enabled: current_admin.totp_enabled?
    }
  end
end
