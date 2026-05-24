# Handles adding a shopper's pile to their Discogs wantlist.
# Requires the shopper to be authenticated via OAuth (session[:shopper_id]).
class PileController < ApplicationController
  def add_to_wantlist
    shopper = DiscogsShopper.find_by(id: session[:shopper_id])
    return render json: { error: "Not authenticated with Discogs. Please connect your account." }, status: :unauthorized unless shopper

    item_ids = params[:items]&.map { |i| i[:discogs_listing_id] } || []

    result = CreatePileWantlistService.new(
      shopper:,
      item_ids:
    ).call

    if result.success?
      render json: {
        wantlist_url: result.wantlist_url,
        added: result.added_count,
        skipped: result.skipped_count
      }, status: :ok
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end
end
