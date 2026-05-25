# Handles adding a shopper's pile to their Discogs wantlist.
# Requires the shopper to be authenticated via OAuth (session[:shopper_id]).
# Requires store context so listing resolution is scoped server-side.
class PileController < ApplicationController
  def add_to_wantlist
    shopper = DiscogsShopper.find_by(id: session[:shopper_id])
    return render json: { error: "Not authenticated with Discogs. Please connect your account." }, status: :unauthorized unless shopper

    store_slug = params[:store_slug]
    return render json: { error: "Store context is required." }, status: :unprocessable_entity unless store_slug.present?

    store = Store.with_discogs_username(store_slug).first
    return render json: { error: "Store not found." }, status: :not_found unless store

    item_ids = Array.wrap(params[:items]).filter_map { |i| i[:discogs_listing_id].to_s.presence }

    result = CreatePileWantlistService.new(
      shopper:,
      item_ids:,
      store:
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
