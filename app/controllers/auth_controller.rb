class AuthController < ApplicationController
  def callback
    slug = session[:oauth_store_slug]
    request_token_token = session[:oauth_request_token]
    request_token_secret = session[:oauth_request_token_secret]
    oauth_verifier = params[:oauth_verifier]

    Rails.logger.info("[AuthCallback] slug=#{slug} has_token=#{request_token_token.present?} has_verifier=#{oauth_verifier.present?}")

    return redirect_with_error("Session expired. Please try again.") if slug.blank? || request_token_token.blank?
    return redirect_with_error("Missing authorization code from Discogs.") if oauth_verifier.blank?

    result = AuthCallbackService.new(
      slug:,
      request_token: request_token_token,
      request_token_secret: request_token_secret,
      oauth_verifier:
    ).call

    if result.success?
      session[:store_owner_id] = result.store.id
      clear_oauth_session
      redirect_to dashboard_path, notice: "Store authorized! Full inventory sync has started."
    else
      redirect_with_error(result.error)
    end
  end

  private

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
end
