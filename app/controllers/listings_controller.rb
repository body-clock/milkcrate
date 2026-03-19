class ListingsController < ApplicationController
  before_action :set_listing

  def show
  end

  def add_to_session
    @dig_session = @current_dig_session || DigSession.create!(store: @listing.store)
    @dig_session.dig_session_items.find_or_create_by!(listing: @listing)
    @dig_session.reload

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_back fallback_location: root_path }
    end
  end

  def remove_from_session
    @dig_session = @current_dig_session
    @dig_session&.dig_session_items&.find_by(listing: @listing)&.destroy
    @dig_session&.reload

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_back fallback_location: root_path }
    end
  end

  private

  def set_listing
    @listing = Listing.find(params[:id])
  end
end
