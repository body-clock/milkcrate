class AuthController < ApplicationController
  def callback
    store_id = session[:oauth_store_id]
    request_token_token = session[:oauth_request_token]
    request_token_secret = session[:oauth_request_token_secret]
    oauth_verifier = params[:oauth_verifier]

    return redirect_with_error("Session expired. Please try again.") if store_id.blank? || request_token_token.blank?
    return redirect_with_error("Missing authorization code from Discogs.") if oauth_verifier.blank?

    store = Store.find_by(id: store_id)
    return redirect_with_error("Store not found.") unless store

    oauth_client = DiscogsOauthClient.new

    # Reconstruct the request token from session
    consumer = build_consumer
    request_token = OAuth::RequestToken.new(consumer, request_token_token, request_token_secret)

    # Exchange verifier for access token
    token_result = oauth_client.exchange_access_token(request_token, oauth_verifier)

    # Verify the identity matches the claimed store
    identity = oauth_client.verify_identity(token_result.access_token, token_result.access_token_secret)
    unless identity.username.downcase == store.discogs_username.downcase
      return redirect_with_error("Discogs identity mismatch. Please try again.")
    end

    # Store tokens and mark as authorized
    store.update!(
      discogs_oauth_token: token_result.access_token,
      discogs_oauth_token_secret: token_result.access_token_secret,
      oauth_authorized_at: Time.current,
      sync_source: :csv_export
    )

    # Set store owner session
    session[:store_owner_id] = store.id
    clear_oauth_session

    # Enqueue initial CSV sync
    CsvExportSyncJob.perform_later(store.id)

    redirect_to dashboard_path, notice: "Store authorized! Full inventory sync has started."
  rescue DiscogsOauthClient::OauthError => e
    redirect_with_error("Authorization failed: #{e.message}")
  end

  private

  def redirect_with_error(message)
    clear_oauth_session
    slug = Store.find_by(id: session[:oauth_store_id])&.discogs_username
    redirect_to slug ? store_path(slug) : root_path, alert: message
  end

  def clear_oauth_session
    session.delete(:oauth_request_token)
    session.delete(:oauth_request_token_secret)
    session.delete(:oauth_store_id)
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
