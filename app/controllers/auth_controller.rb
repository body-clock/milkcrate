# Handles Discogs OAuth authentication flow (store owner and shopper).
class AuthController < ApplicationController
  def callback
    oauth_verifier = params[:oauth_verifier]
    log_conflicting_sessions
    route_oauth_callback(oauth_verifier)
  end

  private

  def log_conflicting_sessions
    return unless session[:oauth_request_token].present? && session[:shopper_oauth_request_token].present?

    Rails.logger.warn("[AuthController] Both store-owner and shopper session keys present — routing as store-owner")
  end

  def route_oauth_callback(oauth_verifier)
    return handle_store_owner_callback(oauth_verifier) if session[:oauth_request_token].present?
    return handle_shopper_callback(oauth_verifier) if session[:shopper_oauth_request_token].present?

    redirect_to root_path, alert: "Session expired. Please try again."
  end

  def handle_store_owner_callback(oauth_verifier)
    clear_shopper_oauth_session
    return if store_owner_session_expired?(oauth_verifier)

    complete_store_owner_auth(**map_store_owner_params(oauth_verifier))
  end

  def store_owner_session_expired?(oauth_verifier)
    return true if expired_store_session?
    return true if missing_owner_verifier?(oauth_verifier)

    false
  end

  def expired_store_session?
    return false unless session[:oauth_store_slug].blank? || session[:oauth_request_token].blank?

    redirect_store_owner_error("Session expired. Please try again.")
    true
  end

  def missing_owner_verifier?(oauth_verifier)
    return false unless oauth_verifier.blank?

    redirect_store_owner_error("Missing authorization code from Discogs.")
    true
  end

  def map_store_owner_params(oauth_verifier)
    { slug: session[:oauth_store_slug],
      request_token_token: session[:oauth_request_token],
      request_token_secret: session[:oauth_request_token_secret],
      oauth_verifier: }
  end

  def complete_store_owner_auth(slug:, request_token_token:, request_token_secret:, oauth_verifier:)
    result = AuthCallbackService.new(
      slug:, request_token: request_token_token,
      request_token_secret:, oauth_verifier:
    ).call

    return redirect_store_owner_error(result.error) unless result.success?

    reset_session
    session[:store_owner_id] = result.store.store_owner_id
    redirect_to dashboard_path, notice: "Store authorized! Full inventory sync has started."
  end

  def handle_shopper_callback(oauth_verifier)
    clear_store_owner_oauth_session
    return if shopper_session_expired?(oauth_verifier)

    complete_shopper_auth(**map_shopper_params(oauth_verifier))
  end

  def shopper_session_expired?(oauth_verifier)
    return true if expired_shopper_session?
    return true if missing_shopper_verifier?(oauth_verifier)

    false
  end

  def expired_shopper_session?
    return false unless session[:shopper_oauth_store_slug].blank? || session[:shopper_oauth_request_token].blank?

    redirect_shopper_error("Session expired. Please try again.")
    true
  end

  def missing_shopper_verifier?(oauth_verifier)
    return false unless oauth_verifier.blank?

    redirect_shopper_error("Missing authorization code from Discogs.")
    true
  end

  def map_shopper_params(oauth_verifier)
    { store_slug: session[:shopper_oauth_store_slug],
      request_token: session[:shopper_oauth_request_token],
      request_token_secret: session[:shopper_oauth_request_token_secret],
      oauth_verifier: }
  end

  def complete_shopper_auth(store_slug:, request_token:, request_token_secret:, oauth_verifier:)
    result = ShopperAuthCallbackService.new(
      store_slug:, request_token:,
      request_token_secret:, oauth_verifier:
    ).call

    return redirect_shopper_error(result.error) unless result.success?

    session[:shopper_id] = result.shopper.id
    clear_shopper_oauth_session
    redirect_to store_path(store_slug), notice: "Connected to Discogs as @#{result.shopper.discogs_username}!"
  end

  def redirect_store_owner_error(message)
    slug = session[:oauth_store_slug]
    clear_store_owner_oauth_session
    redirect_to slug ? store_path(slug) : root_path, alert: message
  end

  def redirect_shopper_error(message)
    store_slug = session[:shopper_oauth_store_slug]
    clear_shopper_oauth_session
    redirect_to store_slug ? store_path(store_slug) : root_path, alert: message
  end

  def clear_store_owner_oauth_session
    session.delete(:oauth_request_token)
    session.delete(:oauth_request_token_secret)
    session.delete(:oauth_store_slug)
  end

  def clear_shopper_oauth_session
    session.delete(:shopper_oauth_request_token)
    session.delete(:shopper_oauth_request_token_secret)
    session.delete(:shopper_oauth_store_slug)
  end
end
