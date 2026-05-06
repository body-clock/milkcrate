class TurnstileVerifier
  SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
  OPEN_TIMEOUT = 2
  READ_TIMEOUT = 5
  WRITE_TIMEOUT = 5

  def self.enabled?
    ActiveModel::Type::Boolean.new.cast(ENV.fetch("TURNSTILE_ENABLED", "false"))
  end

  def self.site_key
    ENV["TURNSTILE_SITE_KEY"]
  end

  def self.verify(token:, remote_ip:)
    return false if token.blank? || secret_key.blank?

    response = connection.post do |request|
      request.body = {
        secret: secret_key,
        response: token,
        remoteip: remote_ip
      }
    end

    response.body["success"] == true
  rescue Faraday::ConnectionFailed => e
    Rails.logger.warn "[TurnstileVerifier] Upstream connection failed: #{e.message}"
    false
  rescue Faraday::TimeoutError => e
    Rails.logger.warn "[TurnstileVerifier] Upstream timeout: #{e.message}"
    false
  rescue Faraday::Error => e
    Rails.logger.warn "[TurnstileVerifier] Upstream error: #{e.message}"
    false
  end

  def self.secret_key
    ENV["TURNSTILE_SECRET_KEY"]
  end
  private_class_method :secret_key

  def self.connection
    Faraday.new(url: SITEVERIFY_URL) do |faraday|
      faraday.request :url_encoded
      faraday.response :json
      faraday.options.open_timeout = OPEN_TIMEOUT
      faraday.options.timeout = READ_TIMEOUT
      faraday.options.write_timeout = WRITE_TIMEOUT
    end
  end
  private_class_method :connection
end
