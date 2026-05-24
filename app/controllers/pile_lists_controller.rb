# Handles creating Discogs lists from a shopper's pile.
# Requires the shopper to be authenticated via OAuth (session[:shopper_id]).
class PileListsController < ApplicationController
  def create
    shopper = DiscogsShopper.find_by(id: session[:shopper_id])
    return render json: { error: "Not authenticated with Discogs. Please connect your account." }, status: :unauthorized unless shopper

    store_slug = params[:store_slug]
    item_ids = params[:items]&.map { |i| i[:discogs_listing_id] } || []

    result = CreatePileListService.new(
      shopper:,
      store_slug:,
      item_ids:
    ).call

    if result.success?
      render json: {
        list_url: result.list_url,
        added: result.added_count,
        skipped: result.skipped_count
      }, status: :ok
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end
end
