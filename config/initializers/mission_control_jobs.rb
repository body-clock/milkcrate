# MissionControl::Jobs is protected by the admin session via route constraints
# in config/routes.rb. The engine is only reachable when the admin has a valid
# session with TOTP verified.
MissionControl::Jobs.http_basic_auth_enabled = false
