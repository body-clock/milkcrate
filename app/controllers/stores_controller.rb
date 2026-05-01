class StoresController < ApplicationController
  layout "inertia_application"

  def featured
    store = Store.find_by(discogs_username: Settings.discogs_username)
    return render :no_stores unless store

    selector = PicksSelector.new(store)
    presenter = CratePresenter.new(store)

    render inertia: "stores/featured", props: {
      store: presenter.store_props(Settings.store_description),
      crates: presenter.build_crates(selector),
      active_crate_slug: "picks"
    }
  end
end
