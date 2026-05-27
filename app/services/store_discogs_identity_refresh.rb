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

    return missing_id_result unless discogs_id.is_a?(Integer)

    @store.update!(discogs_user_id: discogs_id)
    Result.new(store: @store, error: nil)
  rescue Discogs::Errors::ApiError, DiscogsClient::ApiError => e
    Result.new(store: @store, error: "Discogs profile lookup failed: #{e.message}")
  end

  private

  def missing_id_result
    Result.new(store: @store, error: "Profile response contained no usable numeric ID")
  end

  def client
    @client ||= DiscogsClient.new
  end
end
