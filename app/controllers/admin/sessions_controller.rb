class Admin::SessionsController < ApplicationController
  layout "inertia_application"

  before_action :redirect_if_authenticated, only: [:new, :create]

  def new
    render inertia: "admin/login", props: {}
  end

  def create
    admin = AdminUser.find_by(email: session_params[:email]&.strip&.downcase)

    if admin.nil?
      render inertia: "admin/login", props: generic_login_error
      return
    end

    if admin.locked?
      render inertia: "admin/login", props: { errors: { email: ["Too many failed attempts. Try again later."] } }
      return
    end

    if admin.authenticate(session_params[:password])
      admin.reset_failed_attempts!
      reset_session
      session[:admin_id] = admin.id
      session[:totp_verified] = false

      if admin.totp_enabled?
        redirect_to admin_totp_path, notice: "Enter your two-factor authentication code."
      else
        redirect_to admin_totp_setup_path, notice: "Set up two-factor authentication to secure your account."
      end
    else
      admin.increment_failed_attempts!
      render inertia: "admin/login", props: generic_login_error
    end
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
    { errors: { password: ["Invalid email or password."] } }
  end

  def redirect_if_authenticated
    if session[:admin_id].present? && session[:totp_verified]
      redirect_to admin_path
    end
  end
end
