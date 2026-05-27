# Refreshes a store's stored Discogs profile identity from its username.
#
# Populates or updates discogs_user_id from the Discogs seller profile API.
# Intended for explicit operational use (rake task, admin action) rather than
# during a shopper-facing request cycle.
#
# Returns a Result indicating whether the refresh succeeded or failed.
class StoreDiscogsIdentityRefresh
  Result = Data.define(:store, :error) do
    def success? = error.nil?
  end

  Error = Class.new(StandardError)

  def self.call(...) = new(...).call

  def initialize(store:, client: nil)
    @store = store
    @client = client
  end

  def call
    profile = client.seller_profile(@store.discogs_username)
    discogs_id = profile["id"]
    refresh_with_rescue(discogs_id)
  end

  def refresh_with_rescue(discogs_id)
    return invalid_id_result unless valid_discogs_id?(discogs_id)

    @store.update!(discogs_user_id: discogs_id) and Result.new(store: @store, error: nil)
  rescue Discogs::Errors::ApiError, DiscogsClient::ApiError => e
    Result.new(store: @store, error: "Discogs profile lookup failed: #{e.message}")
  end

  def valid_discogs_id?(id)
    id.present? && id.is_a?(Integer)
  end

  def invalid_id_result
    Result.new(store: @store, error: "Profile response contained no usable numeric ID")
  end

  private

  def client
    @client ||= DiscogsClient.new
  end
end
