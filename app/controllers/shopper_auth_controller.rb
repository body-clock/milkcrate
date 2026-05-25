# Handles the Discogs OAuth initiation and session management for shoppers (buyers).
# Separate from the store-owner flow at StoresController#authorize.
class ShopperAuthController < ApplicationController
  def authorize
    store_slug = params[:store_slug]&.strip&.downcase
    return redirect_to root_path, alert: "Invalid store" if store_slug.blank?

    result = AuthorizeShopperService.new(
      store_slug:,
      callback_url: discogs_oauth_callback_url
    ).call

    if result.success?
      session[:shopper_oauth_store_slug] = store_slug
      session[:shopper_oauth_request_token] = result.request_token
      session[:shopper_oauth_request_token_secret] = result.request_token_secret
      redirect_to result.authorize_url, allow_other_host: true
    else
      redirect_to store_path(store_slug), alert: result.error
    end
  end

  def disconnect
    store_slug = session[:shopper_oauth_store_slug]
    session.delete(:shopper_id)
    session.delete(:shopper_oauth_request_token)
    session.delete(:shopper_oauth_request_token_secret)
    session.delete(:shopper_oauth_store_slug)

    redirect_back fallback_location: store_slug ? store_path(store_slug) : root_path,
                  notice: "Disconnected from Discogs."
  end
end
