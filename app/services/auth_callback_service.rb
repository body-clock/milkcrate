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
    perform_authorization
  rescue DiscogsOauthClient::OauthError => e
    oauth_error(e)
  rescue StandardError => e
    unexpected_error(e)
  end

  def perform_authorization
    oauth_client = DiscogsOauthClient.new
    token_result = oauth_client.exchange_access_token(@request_token, @oauth_verifier)
    verify_identity!(oauth_client, token_result)

    finalize_authorization(token_result)
  end

  def finalize_authorization(token_result)
    store = create_store_in_transaction(token_result)
    return error_result("Could not create store for #{@slug}.") unless store

    FullStoreSyncJob.perform_later(store.id)
    Result.new(store:, error: nil)
  end

  private

  def verify_identity!(oauth_client, token_result)
    identity = oauth_client.verify_identity(token_result.access_token, token_result.access_token_secret)
    return if identity.username.downcase == @slug.downcase

    raise StandardError, "Discogs identity mismatch. The Discogs account you authorized (#{identity.username}) does not match the store URL (#{@slug})."
  end

  def create_store_in_transaction(token_result)
    ActiveRecord::Base.transaction do
      store_owner = find_or_create_owner!(@slug, token_result)
      create_and_init_store!(@slug, store_owner)
    end
  end

  def create_and_init_store!(slug, store_owner)
    store = find_or_create_store!(slug, store_owner)
    raise ActiveRecord::Rollback if store.nil?
    store.update!(sync_source: :csv_export)
    store
  end

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
    return store.tap { |s| s.update!(store_owner:) } if store

    create_store(slug, store_owner)
  end

  def create_store(slug, store_owner)
    profile = DiscogsClient.new.seller_profile(slug)
    Store.create!(**build_create_attrs(profile, slug, store_owner))
  rescue DiscogsClient::ApiError
    nil
  end

  def build_create_attrs(profile, slug, store_owner)
    discogs_id = profile["id"] if profile["id"].is_a?(Integer)
    {
      discogs_username: slug,
      name: profile["name"].presence || slug,
      store_owner:,
      discogs_user_id: discogs_id
    }
  end

  def build_request_token(token, secret)
    OAuth::RequestToken.new(DiscogsOauthConsumer.build, token, secret)
  end

  def oauth_error(error)
    error_result("Authorization failed: #{error.message}")
  end

  def unexpected_error(error)
    Rails.logger.error("[AuthCallbackService] Unexpected error: #{error.class}: #{error.message}")
    error_result("An unexpected error occurred: #{error.message}")
  end

  def error_result(message)
    Result.new(store: nil, error: message)
  end
end
