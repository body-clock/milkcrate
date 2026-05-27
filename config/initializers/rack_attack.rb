class Rack::Attack
  # Throttle login attempts by IP: max 10 POSTs to /admin/login per minute
  throttle("admin/logins/ip", limit: 10, period: 1.minute) do |req|
    if req.path == "/admin/login" && req.post?
      req.ip
    end
  end

  # Throttle TOTP challenge attempts by IP: max 5 POSTs to /admin/totp per 30 seconds
  throttle("admin/totp/ip", limit: 5, period: 30.seconds) do |req|
    if req.path == "/admin/totp" && req.post?
      req.ip
    end
  end

  # Throttle TOTP setup confirmation by IP: same limit as challenge (setup shares verify_totp!)
  throttle("admin/totp_setup/ip", limit: 5, period: 30.seconds) do |req|
    if req.path == "/admin/totp/setup" && req.post?
      req.ip
    end
  end

  # Return 429 with a JSON/HTML response
  self.throttled_responder = ->(env) {
    now = Time.current
    match_data = env["rack.attack.match_data"]
    retry_after = (match_data&.dig(:period) || 60).to_s

    if env["HTTP_ACCEPT"]&.include?("application/json")
      [
        429,
        { "Content-Type" => "application/json", "Retry-After" => retry_after },
        [ { error: "Too many requests. Try again later.", retry_after: retry_after.to_i }.to_json ]
      ]
    else
      [
        429,
        { "Content-Type" => "text/html" },
        [ "<html><body style='font-family:system-ui;padding:2rem;text-align:center'><h1>429 — Too many requests</h1><p>Try again in #{retry_after} seconds.</p></body></html>" ]
      ]
    end
  }
end
