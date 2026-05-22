class StoresController < ApplicationController
  layout "inertia_application"

  skip_forgery_protection only: :authorize

  def show
    store = Store.with_discogs_username(params[:slug]).first
    return render_invitation unless store

    render_store(store)
  end

  def authorize
    slug = params[:slug]&.strip&.downcase
    return redirect_to slug.present? ? store_path(slug) : root_path, alert: "Invalid username" if slug.blank?

    # Don't create the store yet — wait until OAuth confirms ownership.
    # But verify they're a seller before sending them to Discogs.
    client = DiscogsClient.new
    inventory = client.seller_inventory(slug, page: 1)
    total_listings = inventory.dig("pagination", "items") || 0

    if total_listings < 500
      redirect_to store_path(slug), alert: "We couldn't find enough inventory for this Discogs account. Milkcrate requires at least 500 vinyl records to create a storefront."
      return
    end

    oauth_client = DiscogsOauthClient.new
    callback_url = discogs_oauth_callback_url
    result = oauth_client.request_token(callback_url:)

    session[:oauth_request_token] = result.request_token.token
    session[:oauth_request_token_secret] = result.request_token.secret
    session[:oauth_store_slug] = slug

    redirect_to result.authorize_url, allow_other_host: true
  rescue DiscogsOauthClient::OauthError => e
    redirect_to store_path(slug), alert: e.message
  rescue DiscogsClient::ApiError
    redirect_to store_path(slug), alert: "Could not verify this Discogs account. Please check the username and try again."
  end

  private

  def render_invitation
    slug = params[:slug]
    waitlist_present = Waitlist.with_discogs_username(slug).exists?

    render inertia: "stores/invitation", props: {
      waitlist_present: waitlist_present,
      slug: slug,
      oauth_available: true,
      alert: flash[:alert],
      notice: flash[:notice]
    }
  end

  def render_store(store)
    cached = StorefrontCuration.cached_curation(store,
      filter_available: !Rails.env.development?)

    render inertia: "stores/show", props: {
      store: store_props(store),
      crates: cached[:crates],
      storefront_sections: cached[:sections],
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
      oauth_authorized: store.oauth_authorized?
    }
  end

end
