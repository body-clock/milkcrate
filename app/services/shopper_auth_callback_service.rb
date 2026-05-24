# Handles the Discogs OAuth callback for shoppers (buyers).
# Creates or updates a DiscogsShopper record with the access tokens
# obtained during the OAuth flow.
class ShopperAuthCallbackService
  Result = Data.define(:shopper, :error) do
    def success? = error.nil?
  end

  def initialize(store_slug:, request_token:, request_token_secret:, oauth_verifier:)
    @store_slug = store_slug
    @request_token = build_request_token(request_token, request_token_secret)
    @oauth_verifier = oauth_verifier
  end

  def call
    oauth_client = DiscogsOauthClient.new

    token_result = oauth_client.exchange_access_token(@request_token, @oauth_verifier)

    identity = oauth_client.verify_identity(token_result.access_token, token_result.access_token_secret)

    shopper = DiscogsShopper.find_or_initialize_by(discogs_username: identity.username)
    shopper.update!(
      oauth_token: token_result.access_token,
      oauth_token_secret: token_result.access_token_secret,
      store_slug: @store_slug,
      last_used_at: Time.current
    )

    Result.new(shopper:, error: nil)
  rescue DiscogsOauthClient::OauthError => e
    error_result("Authorization failed: #{e.message}")
  rescue ActiveRecord::RecordInvalid => e
    error_result("Could not save shopper credentials: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("[ShopperAuthCallbackService] Unexpected error: #{e.class}: #{e.message}")
    error_result("An unexpected error occurred: #{e.message}")
  end

  private

  def build_request_token(token, secret)
    OAuth::RequestToken.new(DiscogsOauthConsumer.build, token, secret)
  end

  def error_result(message)
    Result.new(shopper: nil, error: message)
  end
end
