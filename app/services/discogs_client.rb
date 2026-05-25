# Delegation shim for backward compatibility.
# Delegates public API methods (seller_inventory, release, etc.) to
# Discogs::PublicClient and OAuth-only methods (inventory_export, etc.)
# to Discogs::Marketplace. Existing callers that instantiate DiscogsClient
# continue working without changes.
#
# Error class aliases preserve existing rescue sites:
#   rescue DiscogsClient::RateLimitError  →  Discogs::Errors::RateLimitError
#   rescue DiscogsClient::ApiError        →  Discogs::Errors::ApiError
class DiscogsClient
  RateLimitError = Discogs::Errors::RateLimitError
  ApiError = Discogs::Errors::ApiError

  def initialize(connection: nil, access_token: nil, access_token_secret: nil)
    @public_client = Discogs::PublicClient.new(connection:)
    @marketplace = Discogs::Marketplace.new(
      access_token: access_token,
      access_token_secret: access_token_secret
    ) if access_token.present? && access_token_secret.present?
  end

  # Public endpoints (delegated to PublicClient)

  def seller_inventory(...) = @public_client.seller_inventory(...)
  def release(...) = @public_client.release(...)
  def seller_inventory_pages(...) = @public_client.seller_inventory_pages(...)
  def seller_profile(...) = @public_client.seller_profile(...)

  # OAuth-only endpoints (delegated to Marketplace)

  def inventory_export(...)
    must_have_marketplace!
    @marketplace.inventory_export(...)
  end

  def check_export_status(...)
    must_have_marketplace!
    @marketplace.check_export_status(...)
  end

  def download_export(...)
    must_have_marketplace!
    @marketplace.download_export(...)
  end

  def recent_exports(...)
    must_have_marketplace!
    @marketplace.recent_exports(...)
  end

  def list_orders(...)
    must_have_marketplace!
    @marketplace.list_orders(...)
  end

  private

  def must_have_marketplace!
    raise ApiError, "OAuth access token required for this endpoint" unless @marketplace
  end
end
