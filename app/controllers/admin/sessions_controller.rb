class Admin::SessionsController < ApplicationController
  layout "inertia_application"

  before_action :redirect_if_authenticated, only: [ :new, :create ]

  def new
    render inertia: "admin/login", props: {}
  end

  def create
    result = Admin::Authenticator.new.call(
      email: session_params[:email],
      password: session_params[:password]
    )

    return render inertia: "admin/login", props: locked_error if result.locked?
    return render inertia: "admin/login", props: generic_login_error if result.not_found? || result.invalid_password?

    result.admin.reset_failed_attempts!
    start_session!(result.admin)

    redirect_to result.admin.totp_enabled? ? admin_totp_path : admin_totp_setup_path,
      notice: totp_prompt(result.admin)
  end

  def destroy
    reset_session
    redirect_to admin_login_path, notice: "Signed out."
  end

  private

  def session_params
    params.require(:session).permit(:email, :password)
  end

  def generic_login_error
    { errors: { password: [ "Invalid email or password." ] } }
  end

  def locked_error
    { errors: { email: [ "Too many failed attempts. Try again later." ] } }
  end

  def start_session!(admin)
    reset_session
    session[:admin_id] = admin.id
    session[:totp_verified] = false
  end

  def totp_prompt(admin)
    if admin.totp_enabled?
      "Enter your two-factor authentication code."
    else
      "Set up two-factor authentication to secure your account."
    end
  end

  def redirect_if_authenticated
    redirect_to admin_path if session[:admin_id].present? && session[:totp_verified]
  end
end
