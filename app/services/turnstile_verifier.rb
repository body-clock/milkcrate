class TurnstileVerifier
  SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

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
  rescue Faraday::Error
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
    end
  end
  private_class_method :connection
end
