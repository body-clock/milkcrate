# Handles the Discogs OAuth initiation and session management for shoppers (buyers).
# Separate from the store-owner flow at StoresController#authorize.
class ShopperAuthController < ApplicationController
  def authorize
    store_slug = validate_store_slug or return
    result = authorize_shopper(store_slug)
    return redirect_to store_path(store_slug), alert: result.error unless result.success?

    store_shopper_oauth_session(store_slug, result)
    redirect_with_return_to(result.authorize_url)
  end

  def disconnect
    store_slug = session[:shopper_oauth_store_slug]
    clear_shopper_oauth_session
    redirect_back fallback_location: store_slug ? store_path(store_slug) : root_path,
                  notice: "Disconnected from Discogs."
  end

  private

  def validate_store_slug
    slug = params[:store_slug]&.strip&.downcase
    redirect_to(root_path, alert: "Invalid store") && return unless slug.present?
    slug
  end

  def authorize_shopper(store_slug)
    AuthorizeShopperService.new(store_slug:, callback_url: discogs_oauth_callback_url).call
  end

  def store_shopper_oauth_session(store_slug, result)
    session[:shopper_oauth_store_slug] = store_slug
    session[:shopper_oauth_request_token] = result.request_token
    session[:shopper_oauth_request_token_secret] = result.request_token_secret
  end

  def redirect_with_return_to(authorize_url)
    session[:shopper_return_to] = params[:return_to].presence
    redirect_to authorize_url, allow_other_host: true
  end

  def clear_shopper_oauth_session
    session.delete(:shopper_id)
    session.delete(:shopper_oauth_request_token)
    session.delete(:shopper_oauth_request_token_secret)
    session.delete(:shopper_oauth_store_slug)
    session.delete(:shopper_return_to)
  end
end
