# Base controller for routes that require an authenticated store-owner session.
# Inherit from this instead of ApplicationController to automatically enforce
# session-based authentication via before_action, without forcing public
# controllers (PagesController, AuthController, etc.) to opt out.
class SessionAuthenticatedController < ApplicationController
  before_action :require_store_owner_session

  private

  def require_store_owner_session
    owner_id = session[:store_owner_id]
    @current_store_owner = StoreOwner.find_by(id: owner_id)

    unless @current_store_owner&.oauth_authorized?
      redirect_to root_path, alert: "Please claim your store first."
    end
  end

  def current_store_owner
    @current_store_owner
  end

  def current_store
    @current_store ||= @current_store_owner&.stores&.first
  end
end
