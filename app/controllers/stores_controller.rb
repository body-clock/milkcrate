class StoresController < ApplicationController
  layout "inertia_application"

  def featured
    store = Store.find_by(discogs_username: Settings.discogs_username)
    return render :no_stores unless store

    render_store(store)
  end

  def show
    store = Store.with_discogs_username(params[:slug]).first
    return render_invitation unless store

    render_store(store)
  end

  private

  def render_invitation
    slug = params[:slug]
    waitlist_present = Waitlist.with_discogs_username(slug).exists?

    render inertia: "stores/invitation", props: {
      waitlist_present: waitlist_present,
      slug: slug
    }
  end

  def render_store(store)
    curation  = StorefrontCuration.new(store, filter_available: !Rails.env.development?)
    presenter = CratePresenter.new(store)
    curated_crates = curation.crates
    storefront_groups = curation.storefront_groups

    render inertia: "stores/featured", props: {
      store: presenter.store_props,
      crates: presenter.build_crates(curated_crates),
      storefront_sections: presenter.build_storefront_sections(storefront_groups),
      active_crate_slug: "picks"
    }
  end
end
