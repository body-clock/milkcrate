class AuthController < ApplicationController
  def callback
    slug = session[:oauth_store_slug]
    request_token_token = session[:oauth_request_token]
    request_token_secret = session[:oauth_request_token_secret]
    oauth_verifier = params[:oauth_verifier]

    Rails.logger.info("[AuthCallback] slug=#{slug} has_token=#{request_token_token.present?} has_verifier=#{oauth_verifier.present?}")

    return redirect_with_error("Session expired. Please try again.") if slug.blank? || request_token_token.blank?
    return redirect_with_error("Missing authorization code from Discogs.") if oauth_verifier.blank?

    oauth_client = DiscogsOauthClient.new

    # Reconstruct the request token from session
    consumer = build_consumer
    request_token = OAuth::RequestToken.new(consumer, request_token_token, request_token_secret)

    # Exchange verifier for access token
    Rails.logger.info("[AuthCallback] Exchanging verifier for access token...")
    token_result = oauth_client.exchange_access_token(request_token, oauth_verifier)
    Rails.logger.info("[AuthCallback] Access token received")

    # Verify the identity matches the claimed store slug
    Rails.logger.info("[AuthCallback] Verifying identity...")
    identity = oauth_client.verify_identity(token_result.access_token, token_result.access_token_secret)
    Rails.logger.info("[AuthCallback] Identity verified: #{identity.username}")

    unless identity.username.downcase == slug.downcase
      Rails.logger.warn("[AuthCallback] Identity mismatch: got #{identity.username}, expected #{slug}")
      return redirect_with_error("Discogs identity mismatch. The Discogs account you authorized (#{identity.username}) does not match the store URL (#{slug}).")
    end

    # Look up existing store or create one (only after OAuth confirms ownership)
    store = Store.with_discogs_username(slug).first || create_store(slug)
    unless store
      Rails.logger.error("[AuthCallback] Could not create store for #{slug}")
      return redirect_with_error("Could not create store for #{slug}.")
    end

    # Store tokens and mark as authorized
    store.update!(
      discogs_oauth_token: token_result.access_token,
      discogs_oauth_token_secret: token_result.access_token_secret,
      oauth_authorized_at: Time.current,
      sync_source: :csv_export
    )
    Rails.logger.info("[AuthCallback] Store #{store.id} authorized successfully")

    # Set store owner session
    session[:store_owner_id] = store.id
    clear_oauth_session

    # Enqueue initial CSV sync
    CsvExportSyncJob.perform_later(store.id)

    redirect_to dashboard_path, notice: "Store authorized! Full inventory sync has started."
  rescue DiscogsOauthClient::OauthError => e
    Rails.logger.error("[AuthCallback] OAuth error: #{e.message}")
    redirect_with_error("Authorization failed: #{e.message}")
  rescue StandardError => e
    Rails.logger.error("[AuthCallback] Unexpected error: #{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
    redirect_with_error("An unexpected error occurred: #{e.message}")
  end

  private

  def create_store(slug)
    profile = DiscogsClient.new.seller_profile(slug)
    name = profile["name"].presence || slug
    Store.create!(discogs_username: slug, name:)
  rescue DiscogsClient::ApiError
    nil
  end

  def redirect_with_error(message)
    slug = session[:oauth_store_slug]
    clear_oauth_session
    redirect_to slug ? store_path(slug) : root_path, alert: message
  end

  def clear_oauth_session
    session.delete(:oauth_request_token)
    session.delete(:oauth_request_token_secret)
    session.delete(:oauth_store_slug)
  end

  def build_consumer
    key = Rails.application.credentials.dig(:discogs, :consumer_key)
    secret = Rails.application.credentials.dig(:discogs, :consumer_secret)
    OAuth::Consumer.new(
      key,
      secret,
      site: "https://api.discogs.com",
      request_token_path: "/oauth/request_token",
      authorize_path: "/oauth/authorize",
      access_token_path: "/oauth/access_token"
    )
  end
end
