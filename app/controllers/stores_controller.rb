class StoresController < ApplicationController
  def featured
    entries = Store.rotation
    return render :no_stores if entries.empty?

    entry = entries[Date.current.jd % entries.count]
    @store = Store.find_by(discogs_username: entry["username"])
    return render :no_stores unless @store

    @description = entry["description"]
    @sections = build_sections(@store)
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

  def sync
    @store = Store.find(params[:id])
    FullStoreSyncJob.perform_later(@store.id)
    redirect_to root_path, notice: "Full sync started."
  end

  def picks_preview
    @store = Store.find(params[:id])
    daily_ids = daily_selection_ids(@store)
    @picks = PicksSelector.new(@store).select(count: 20, seed: params[:seed], listing_ids: daily_ids)
    @session_listing_ids = @current_dig_session&.listing_ids&.to_set || Set.new
  end

  private

  def store_params
    params.expect(store: [ :name, :discogs_username ])
  end

  def build_sections(store)
    sections = []
    daily_ids = daily_selection_ids(store)

    picks = PicksSelector.new(store).select(listing_ids: daily_ids)
    sections << { name: "Milkcrate Picks", slug: "picks", listings: picks, count: picks.size, preloaded: true } if picks.any?

    new_arrivals = store.listings.new_arrivals
    sections << { name: "New Arrivals", slug: "new-arrivals", listings: new_arrivals, count: new_arrivals.size } if new_arrivals.any?

    daily_scope = daily_ids.any? ? store.listings.where(id: daily_ids) : store.listings
    genres = daily_scope.pluck(:genres).flatten.tally.sort_by { |_, count| -count }
    genres.each do |genre, _|
      count = daily_scope.by_genre(genre).count
      sections << { name: genre, slug: genre.parameterize, listings: daily_scope.by_genre(genre).daily_shuffle, count: count }
    end

    sections
  end

  def daily_selection_ids(store)
    selection = DailySelection.on(store) || DailySelectionService.new(store).generate
    selection.listing_ids
  end
end
