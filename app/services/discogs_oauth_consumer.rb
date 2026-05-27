# Builds the OAuth consumer for Discogs API authentication.
class DiscogsOauthConsumer
  class ConfigurationError < StandardError; end

  def self.build
    key = Rails.application.credentials.dig(:discogs, :consumer_key)
    secret = Rails.application.credentials.dig(:discogs, :consumer_secret)

    validate_credentials!(key, secret)
    build_consumer(key, secret)
  end

  def self.validate_credentials!(key, secret)
    raise ConfigurationError, "Discogs consumer key is not configured" if key.blank?
    raise ConfigurationError, "Discogs consumer secret is not configured" if secret.blank?
  end

  def self.build_consumer(key, secret)
    OAuth::Consumer.new(
      key, secret,
      site: "https://api.discogs.com",
      request_token_path: "/oauth/request_token",
      authorize_path: "/oauth/authorize",
      access_token_path: "/oauth/access_token"
    )
  end

  private_class_method :validate_credentials!, :build_consumer
end
