MissionControl::Jobs.http_basic_auth_enabled = Rails.env.production?

MissionControl::Jobs.http_basic_auth_user =
  Rails.application.credentials.dig(:http_basic_auth, :user)

MissionControl::Jobs.http_basic_auth_password =
  Rails.application.credentials.dig(:http_basic_auth, :password)
