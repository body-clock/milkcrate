MissionControl::Jobs.http_basic_auth_enabled =
  ENV.fetch("MISSION_CONTROL_JOBS_HTTP_BASIC_ENABLED", Rails.env.production? ? "true" : "false") == "true"

MissionControl::Jobs.http_basic_auth_user =
  ENV["MISSION_CONTROL_JOBS_HTTP_BASIC_USER"] ||
  Rails.application.credentials.dig(:mission_control_jobs, :http_basic_auth_user)

MissionControl::Jobs.http_basic_auth_password =
  ENV["MISSION_CONTROL_JOBS_HTTP_BASIC_PASSWORD"] ||
  Rails.application.credentials.dig(:mission_control_jobs, :http_basic_auth_password)
