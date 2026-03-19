class StoreSectionsController < ApplicationController
  before_action :set_store

  def index
    redirect_to store_path(@store)
  end

  def show
    @section_slug = params[:id]
    @section_name = @section_slug == "new-arrivals" ? "New Arrivals" : @section_slug.titleize
    @listings = fetch_section_listings.limit(100).to_a
    @session_listing_ids = @current_dig_session&.listing_ids&.to_set || Set.new
  end

  private

  def set_store
    @store = Store.find(params[:store_id])
  end

  def fetch_section_listings
    case @section_slug
    when "new-arrivals"
      @store.listings.recent
    when "picks"
      Listing.where(id: PicksSelector.new(@store).select(count: 100).map(&:id))
    else
      genre = @section_slug.gsub("-", " ").split.map(&:capitalize).join(" ")
      @store.listings.by_genre(genre).daily_shuffle
    end
  end
end
