class ListingsController < ApplicationController
  before_action :set_listing

  def add_to_session
    @current_dig_session ||= DigSession.create!(store: @listing.store)
    @current_dig_session.dig_session_items.find_or_create_by!(listing: @listing)
    redirect_back fallback_location: root_path
  end

  def remove_from_session
    @current_dig_session&.dig_session_items&.find_by(listing: @listing)&.destroy
    redirect_back fallback_location: root_path
  end

  private

  def set_listing
    @listing = Listing.find(params[:id])
  end
end
