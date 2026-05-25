# Initiates a Discogs OAuth 1.0a flow for a shopper (buyer).
# Unlike AuthorizeStoreService, this does not check inventory minimums —
# any Discogs user can authenticate as a shopper.
class AuthorizeShopperService
  Result = Data.define(:authorize_url, :request_token, :request_token_secret, :error) do
    def success? = error.nil?
  end

  def initialize(store_slug:, callback_url:)
    @store_slug = store_slug
    @callback_url = callback_url
  end

  def call
    oauth_client = DiscogsOauthClient.new
    result = oauth_client.request_token(callback_url: @callback_url)

    Result.new(
      authorize_url: result.authorize_url,
      request_token: result.request_token.token,
      request_token_secret: result.request_token.secret,
      error: nil
    )
  rescue DiscogsOauthClient::OauthError => e
    error_result(e.message)
  end

  private

  def error_result(message)
    Result.new(authorize_url: nil, request_token: nil, request_token_secret: nil, error: message)
  end
end
