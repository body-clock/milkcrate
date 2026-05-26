# Base controller for admin routes with authentication and admin-scoped layout.
class Admin::BaseController < ApplicationController
  before_action :http_basic_auth_admin

  private

  def http_basic_auth_admin
    creds_user = Rails.application.credentials.dig(:http_basic_auth, :user)
    creds_pass = Rails.application.credentials.dig(:http_basic_auth, :password)

    return request_http_basic_authentication("Admin") unless creds_user && creds_pass

    authenticate_or_request_with_http_basic("Admin") do |username, password|
      ActiveSupport::SecurityUtils.secure_compare(username, creds_user) &
        ActiveSupport::SecurityUtils.secure_compare(password, creds_pass)
    end
  end
end
