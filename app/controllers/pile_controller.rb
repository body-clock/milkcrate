# Handles adding a shopper's pile to their Discogs wantlist.
# Requires the shopper to be authenticated via OAuth (session[:shopper_id]).
# Requires store context so listing resolution is scoped server-side.
class PileController < ApplicationController
  def add_to_wantlist
    unless seller_wantlist_handoff_enabled?
      return render json: { error: "This feature is not yet available." }, status: :forbidden
    end

    shopper = DiscogsShopper.find_by(id: session[:shopper_id])
    return render json: { error: "Not authenticated with Discogs. Please connect your account." }, status: :unauthorized unless shopper

    store_slug = params[:store_slug]
    return render json: { error: "Store context is required." }, status: :unprocessable_entity unless store_slug.present?

    store = Store.with_discogs_username(store_slug).first
    return render json: { error: "Store not found." }, status: :not_found unless store

    item_ids = params[:items]&.map { |i| i[:discogs_listing_id] } || []

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

  private

  def seller_wantlist_handoff_enabled?
    return false unless Settings.respond_to?(:features)
    return false unless Settings.features.respond_to?(:seller_wantlist_handoff)

    ActiveModel::Type::Boolean.new.cast(
      ENV.fetch("SELLER_WANTLIST_HANDOFF_ENABLED", Settings.features.seller_wantlist_handoff.enabled.to_s)
    )
  end
end
