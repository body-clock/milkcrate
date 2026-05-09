class Admin::BaseController < ApplicationController
  creds_user = ENV["ADMIN_HTTP_BASIC_USER"].presence || Rails.application.credentials.dig(:admin, :http_basic_auth_user)
  creds_pass = ENV["ADMIN_HTTP_BASIC_PASSWORD"].presence || Rails.application.credentials.dig(:admin, :http_basic_auth_password)

  if creds_user && creds_pass
    http_basic_authenticate_with(name: creds_user, password: creds_pass)
  end
end
