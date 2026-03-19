class StoresController < ApplicationController
  def index
    @stores = Store.all.order(:name)
  end

  def show
    @store = Store.find(params[:id])
    @sections = build_sections(@store)
  end

  def new
    @store = Store.new
  end

  def create
    @store = Store.new(store_params)
    if @store.save
      FullStoreSyncJob.perform_later(@store.id)
      redirect_to @store, notice: "Store added. Syncing inventory in the background…"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def sync
    @store = Store.find(params[:id])
    FullStoreSyncJob.perform_later(@store.id)
    redirect_to @store, notice: "Full sync started."
  end

  def picks_preview
    @store = Store.find(params[:id])
    @picks = PicksSelector.new(@store).select(count: 20, seed: params[:seed])
    @session_listing_ids = @current_dig_session&.listing_ids&.to_set || Set.new
  end

  private

  def store_params
    params.expect(store: [ :name, :discogs_username ])
  end

  def build_sections(store)
    sections = []

    picks = PicksSelector.new(store).select
    sections << { name: "Milkcrate Picks", slug: "picks", listings: picks, count: picks.size, preloaded: true } if picks.any?

    new_arrivals = store.listings.new_arrivals
    sections << { name: "New Arrivals", slug: "new-arrivals", listings: new_arrivals, count: new_arrivals.size } if new_arrivals.any?

    genres = store.listings.pluck(:genres).flatten.tally.sort_by { |_, count| -count }
    genres.each do |genre, count|
      sections << { name: genre, slug: genre.parameterize, listings: store.listings.by_genre(genre).daily_shuffle, count: count }
    end

    sections
  end
end
