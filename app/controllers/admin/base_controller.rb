class Admin::BaseController < ApplicationController
  before_action :http_basic_auth_admin

  private

  def http_basic_auth_admin
    creds_user = ENV["ADMIN_HTTP_BASIC_USER"].presence || Rails.application.credentials.dig(:admin, :http_basic_auth_user)
    creds_pass = ENV["ADMIN_HTTP_BASIC_PASSWORD"].presence || Rails.application.credentials.dig(:admin, :http_basic_auth_password)

    return unless creds_user && creds_pass

    authenticate_or_request_with_http_basic("Admin") do |username, password|
      ActiveSupport::SecurityUtils.secure_compare(username, creds_user) &
        ActiveSupport::SecurityUtils.secure_compare(password, creds_pass)
    end
  end
end
