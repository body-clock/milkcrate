class StoresController < ApplicationController
  layout "inertia_application"

  def featured
    store = Store.find_by(discogs_username: Settings.discogs_username)
    return render :no_stores unless store

    render_store(store)
  end

  def show
    store = Store.find_by(discogs_username: params[:slug])
    return render :no_stores unless store

    render_store(store)
  end

  private

  def render_store(store)
    curation  = StorefrontCuration.new(store)
    presenter = CratePresenter.new(store)
    curated_crates = curation.crates

    render inertia: "stores/featured", props: {
      store: presenter.store_props,
      crates: presenter.build_crates(curated_crates),
      storefront_sections: presenter.build_storefront_sections(curation.storefront_sections),
      active_crate_slug: "picks"
    }
  end
end
