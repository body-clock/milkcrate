# Handles Discogs OAuth authentication flow (store owner and shopper).
class AuthController < ApplicationController
  def callback
    oauth_verifier = params[:oauth_verifier]

    if session[:shopper_oauth_store_slug].present?
      handle_shopper_callback(oauth_verifier)
    else
      handle_store_owner_callback(oauth_verifier)
    end
  end

  private

  def handle_store_owner_callback(oauth_verifier)
    slug = session[:oauth_store_slug]
    request_token_token = session[:oauth_request_token]
    request_token_secret = session[:oauth_request_token_secret]

    Rails.logger.info("[AuthCallback:store] slug=#{slug}")

    return redirect_store_owner_error("Session expired. Please try again.") if slug.blank? || request_token_token.blank?
    return redirect_store_owner_error("Missing authorization code from Discogs.") if oauth_verifier.blank?

    result = AuthCallbackService.new(
      slug:,
      request_token: request_token_token,
      request_token_secret: request_token_secret,
      oauth_verifier:
    ).call

    if result.success?
      reset_session
      session[:store_owner_id] = result.store.store_owner_id
      redirect_to dashboard_path, notice: "Store authorized! Full inventory sync has started."
    else
      redirect_store_owner_error(result.error)
    end
  end

  def handle_shopper_callback(oauth_verifier)
    store_slug = session[:shopper_oauth_store_slug]
    request_token = session[:shopper_oauth_request_token]
    request_token_secret = session[:shopper_oauth_request_token_secret]

    Rails.logger.info("[AuthCallback:shopper] store_slug=#{store_slug}")

    return redirect_shopper_error("Session expired. Please try again.") if store_slug.blank? || request_token.blank?
    return redirect_shopper_error("Missing authorization code from Discogs.") if oauth_verifier.blank?

    result = ShopperAuthCallbackService.new(
      store_slug:,
      request_token:,
      request_token_secret:,
      oauth_verifier:
    ).call

    if result.success?
      session[:shopper_id] = result.shopper.id
      clear_shopper_oauth_session
      redirect_to store_path(store_slug), notice: "Connected to Discogs as @#{result.shopper.discogs_username}!"
    else
      redirect_shopper_error(result.error)
    end
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
