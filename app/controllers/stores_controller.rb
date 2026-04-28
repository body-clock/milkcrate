class StoresController < ApplicationController
  layout "inertia_application", only: :featured

  def featured
    entries = Store.rotation
    return render :no_stores if entries.empty?

    entry = entries[Date.current.jd % entries.count]
    store = Store.find_by(discogs_username: entry["username"])
    return render :no_stores unless store

    daily_ids = DailySelection.fetch_or_generate(store).listing_ids
    picks = PicksSelector.new(store).select(listing_ids: daily_ids)
    presenter = CratePresenter.new(store, current_session: @current_dig_session)

    render inertia: "stores/featured", props: {
      store: presenter.store_props(entry["description"]),
      crates: presenter.build_crates(picks, daily_ids),
      active_crate_slug: "picks",
      current_session: presenter.session_props
    }
  end

  def new
    @store = Store.new
  end

  def create
    @store = Store.new(store_params)
    if @store.save
      FullStoreSyncJob.perform_later(@store.id)
      redirect_to root_path, notice: "Store added. Syncing inventory in the background…"
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def store_params
    params.expect(store: [ :name, :discogs_username ])
  end
end
