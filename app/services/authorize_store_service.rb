class AuthorizeStoreService
  MINIMUM_LISTINGS = 500

  Result = Data.define(:authorize_url, :request_token, :request_token_secret, :error) do
    def success? = error.nil?
  end

  def initialize(slug:, callback_url:)
    @slug = slug
    @callback_url = callback_url
  end

  def call
    client = DiscogsClient.new
    inventory = client.seller_inventory(@slug, page: 1)
    total_listings = inventory.dig("pagination", "items") || 0

    if total_listings < MINIMUM_LISTINGS && !Rails.env.development?
      return error_result("We couldn't find enough inventory for this Discogs account. Milkcrate requires at least #{MINIMUM_LISTINGS} vinyl records to create a storefront.")
    end

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
  rescue DiscogsClient::ApiError
    error_result("Could not verify this Discogs account. Please check the username and try again.")
  end

  private

  def error_result(message)
    Result.new(authorize_url: nil, request_token: nil, request_token_secret: nil, error: message)
  end
end
