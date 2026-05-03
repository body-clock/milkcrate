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
    selector = PicksSelector.new(store)
    presenter = CratePresenter.new(store)

    render inertia: "stores/featured", props: {
      store: presenter.store_props,
      crates: presenter.build_crates(selector),
      active_crate_slug: "picks"
    }
  end
end
