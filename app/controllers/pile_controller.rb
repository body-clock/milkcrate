# Handles adding a shopper's pile to their Discogs wantlist.
# Requires the shopper to be authenticated via OAuth (session[:shopper_id]).
# Requires store context so listing resolution is scoped server-side.
class PileController < ApplicationController
  def add_to_wantlist
    shopper = find_shopper or return
    store = find_store or return

    result = create_wantlist(shopper, store)
    render_wantlist_result(result)
  end

  private

  def create_wantlist(shopper, store)
    item_ids = Array.wrap(params[:items]).filter_map { |i| i[:discogs_listing_id].to_s.presence }
    CreatePileWantlistService.new(shopper:, item_ids:, store:).call
  end

  def find_shopper
    shopper = DiscogsShopper.find_by(id: session[:shopper_id])
    return shopper if shopper

    render json: { error: "Not authenticated with Discogs. Please connect your account." }, status: :unauthorized
    nil
  end

  def find_store
    store_slug = params[:store_slug]
    render(json: { error: "Store context is required." }, status: :unprocessable_content) && return unless store_slug.present?

    store = Store.with_discogs_username(store_slug).first
    render(json: { error: "Store not found." }, status: :not_found) && return unless store

    store
  end

  def render_wantlist_result(result)
    if result.success?
      render json: {
        wantlist_url: result.wantlist_url,
        added: result.added_count,
        skipped: result.skipped_count
      }, status: :ok
    else
      render json: { error: result.error }, status: :unprocessable_content
    end
  end
end
