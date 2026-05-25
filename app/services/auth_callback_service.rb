# Handles the OAuth callback from Discogs after a user authorizes the application.
class AuthCallbackService
  Result = Data.define(:store, :error) do
    def success? = error.nil?
  end

  class CallbackError < StandardError; end

  def initialize(slug:, request_token:, request_token_secret:, oauth_verifier:)
    @slug = slug
    @request_token = build_request_token(request_token, request_token_secret)
    @oauth_verifier = oauth_verifier
  end

  def call
    oauth_client = DiscogsOauthClient.new

    token_result = oauth_client.exchange_access_token(@request_token, @oauth_verifier)

    identity = oauth_client.verify_identity(token_result.access_token, token_result.access_token_secret)
    return error_result("Discogs identity mismatch. The Discogs account you authorized (#{identity.username}) does not match the store URL (#{@slug}).") unless identity.username.downcase == @slug.downcase

    store = nil
    ActiveRecord::Base.transaction do
      store_owner = find_or_create_owner!(@slug, token_result)
      store = find_or_create_store!(@slug, store_owner)
      raise ActiveRecord::Rollback if store.nil?

      store.update!(sync_source: :csv_export)
    end

    return error_result("Could not create store for #{@slug}.") unless store
    FullStoreSyncJob.perform_later(store.id)

    Result.new(store:, error: nil)
  rescue DiscogsOauthClient::OauthError => e
    error_result("Authorization failed: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("[AuthCallbackService] Unexpected error: #{e.class}: #{e.message}")
    error_result("An unexpected error occurred: #{e.message}")
  end

  private

  def find_or_create_owner!(slug, token_result)
    owner = StoreOwner.find_or_initialize_by(discogs_username: slug)
    owner.update!(
      discogs_oauth_token: token_result.access_token,
      discogs_oauth_token_secret: token_result.access_token_secret,
      oauth_authorized_at: Time.current
    )
    owner
  end

  def find_or_create_store!(slug, store_owner)
    store = Store.with_discogs_username(slug).first
    return store if store&.store_owner == store_owner

    if store
      store.update!(store_owner:)
      store
    else
      create_store(slug, store_owner)
    end
  end

  def create_store(slug, store_owner)
    profile = DiscogsClient.new.seller_profile(slug)
    name = profile["name"].presence || slug
    discogs_id = profile["id"] if profile["id"].is_a?(Integer)
    Store.create!(discogs_username: slug, name:, store_owner:, discogs_user_id: discogs_id)
  rescue DiscogsClient::ApiError
    nil
  end

  def build_request_token(token, secret)
    OAuth::RequestToken.new(DiscogsOauthConsumer.build, token, secret)
  end

  def error_result(message)
    Result.new(store: nil, error: message)
  end
end
