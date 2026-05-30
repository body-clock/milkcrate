# Verifies Cloudflare Turnstile captcha tokens for the waitlist signup flow.
class TurnstileVerifier
  SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
  OPEN_TIMEOUT = 2
  READ_TIMEOUT = 5
  WRITE_TIMEOUT = 5

  def self.enabled?
    ActiveModel::Type::Boolean.new.cast(ENV.fetch("TURNSTILE_ENABLED", "false"))
  end

  def self.site_key
    Rails.application.credentials.dig(:turnstile, :site_key)
  end

  def self.verify(token:, remote_ip:)
    return false if token.blank? || secret_key.blank?
    verify_token(token, remote_ip)
  rescue Faraday::ConnectionFailed, Faraday::TimeoutError, Faraday::Error => e
    log_faraday_error(e)
  end

  def self.verify_token(token, remote_ip)
    response = connection.post do |request|
      request.body = { secret: secret_key, response: token, remoteip: remote_ip }
    end
    response.body["success"] == true
  end

  def self.log_faraday_error(error)
    prefix = error_class_prefix(error)
    Rails.logger.warn "[TurnstileVerifier] #{prefix}: #{error.message}"
    false
  end

  def self.error_class_prefix(error)
    return "Upstream connection failed" if error.is_a?(Faraday::ConnectionFailed)
    return "Upstream timeout" if error.is_a?(Faraday::TimeoutError)
    "Upstream error"
  end

  def self.secret_key
    Rails.application.credentials.dig(:turnstile, :secret_key)
  end

  def self.connection
    Faraday.new(url: SITEVERIFY_URL) do |f|
      f.request :url_encoded
      f.response :json
      faraday_defaults(f)
    end
  end

  def self.faraday_defaults(f)
    f.options.open_timeout = OPEN_TIMEOUT
    set_faraday_timeouts(f)
  end

  def self.set_faraday_timeouts(f)
    f.options.timeout = READ_TIMEOUT
    f.options.write_timeout = WRITE_TIMEOUT
  end

  private_class_method :verify_token, :log_faraday_error, :error_class_prefix,
    :secret_key, :connection, :faraday_defaults, :set_faraday_timeouts
end
