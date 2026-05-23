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
    return Result.new(store: nil, error: "Discogs identity mismatch. The Discogs account you authorized (#{identity.username}) does not match the store URL (#{@slug}).") unless identity.username.downcase == @slug.downcase

    store = Store.with_discogs_username(@slug).first || create_store(@slug)
    return Result.new(store: nil, error: "Could not create store for #{@slug}.") unless store

    store.update!(
      discogs_oauth_token: token_result.access_token,
      discogs_oauth_token_secret: token_result.access_token_secret,
      oauth_authorized_at: Time.current,
      sync_source: :csv_export
    )

    CsvExportSyncJob.perform_later(store.id)

    Result.new(store:, error: nil)
  rescue DiscogsOauthClient::OauthError => e
    Result.new(store: nil, error: "Authorization failed: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("[AuthCallbackService] Unexpected error: #{e.class}: #{e.message}")
    Result.new(store: nil, error: "An unexpected error occurred: #{e.message}")
  end

  private

  def create_store(slug)
    profile = DiscogsClient.new.seller_profile(slug)
    name = profile["name"].presence || slug
    Store.create!(discogs_username: slug, name:)
  rescue DiscogsClient::ApiError
    nil
  end

  def build_request_token(token, secret)
    OAuth::RequestToken.new(DiscogsOauthConsumer.build, token, secret)
  end
end
