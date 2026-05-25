# Public storefront pages displaying curated crates and listings.
class StoresController < ApplicationController
  layout "inertia_application"

  def show
    store = Store.with_discogs_username(params[:slug]).first
    return render_invitation unless store

    render_store(store)
  end

  def authorize
    slug = params[:slug]&.strip&.downcase
    return redirect_to slug.present? ? store_path(slug) : root_path, alert: "Invalid username" if slug.blank?

    result = AuthorizeStoreService.new(slug:, callback_url: discogs_oauth_callback_url).call

    if result.success?
      session[:oauth_request_token] = result.request_token
      session[:oauth_request_token_secret] = result.request_token_secret
      session[:oauth_store_slug] = slug
      redirect_to result.authorize_url, allow_other_host: true
    else
      redirect_to store_path(slug), alert: result.error
    end
  end

  private

  def render_store(store)
    cached = StorefrontCuration.cached_curation(store,
      filter_available: !Rails.env.development?)

    render inertia: "stores/show", props: {
      store: store_props(store),
      shopper: shopper_props,
      crates: cached[:crates],
      storefront_sections: cached[:sections],
      alert: flash[:alert],
      notice: flash[:notice]
    }
  end

  def render_invitation
    slug = params[:slug]
    waitlist_present = Waitlist.with_discogs_username(slug).exists?

    render inertia: "stores/invitation", props: {
      waitlist_present: waitlist_present,
      slug: slug,
      oauth_available: true,
      shopper: shopper_props,
      alert: flash[:alert],
      notice: flash[:notice]
    }
  end

  def store_props(store)
    {
      id: store.id,
      name: store.name,
      discogs_username: store.discogs_username,
      description: store.description,
      total_listings: store.total_listings,
      sync_status: store.sync_status,
      last_sync_error_at: store.last_sync_error_at,
      enrichment_status: store.enrichment_status,
      last_enriched_at: store.last_enriched_at,
      oauth_authorized: store.oauth_authorized?,
      handoff_available: store.discogs_user_id.present?
    }
  end

  def shopper_props
    shopper = DiscogsShopper.find_by(id: session[:shopper_id])
    return nil unless shopper&.authenticated?

    { discogs_username: shopper.discogs_username }
  end
end
