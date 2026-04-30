class StoresController < ApplicationController
  layout "inertia_application"

  def featured
    store = Store.find_by(discogs_username: StoreConfig.username)
    return render :no_stores unless store

    daily_ids = DailySelection.fetch_or_generate(store).listing_ids
    picks = PicksSelector.new(store).select(listing_ids: daily_ids)
    presenter = CratePresenter.new(store)

    render inertia: "stores/featured", props: {
      store: presenter.store_props(StoreConfig.description),
      crates: presenter.build_crates(picks, daily_ids),
      active_crate_slug: "picks"
    }
  end
end
