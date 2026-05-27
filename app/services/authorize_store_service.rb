# Authorizes a store owner by exchanging OAuth tokens and setting up the store.
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
    return enforce_minimum_error(inventory_count) if enforce_minimum_listings?(inventory_count)
    request_oauth_token
  rescue DiscogsClient::ApiError, DiscogsOauthClient::OauthError => e
    oauth_error(e)
  end

  def oauth_error(error)
    message = error.is_a?(DiscogsOauthClient::OauthError) ? error.message : "Could not verify this Discogs account. Please check the username and try again."
    error_result(message)
  end

  def inventory_count
    inventory = DiscogsClient.new.seller_inventory(@slug, page: 1)
    inventory.dig("pagination", "items") || 0
  end

  def enforce_minimum_error(total_listings)
    return nil unless enforce_minimum_listings?(total_listings)
    error_result("We couldn't find enough inventory for this Discogs account. Milkcrate requires at least #{MINIMUM_LISTINGS} vinyl records to create a storefront.")
  end

  def request_oauth_token
    oauth_client = DiscogsOauthClient.new
    result = oauth_client.request_token(callback_url: @callback_url)
    Result.new(
      authorize_url: result.authorize_url,
      request_token: result.request_token.token,
      request_token_secret: result.request_token.secret,
      error: nil
    )
  end

  private

  def enforce_minimum_listings?(total_listings)
    return false if Rails.env.development?
    return false if Settings.discogs.minimum_listing_exemptions.include?(@slug)

    total_listings < MINIMUM_LISTINGS
  end

  def error_result(message)
    Result.new(authorize_url: nil, request_token: nil, request_token_secret: nil, error: message)
  end
end
