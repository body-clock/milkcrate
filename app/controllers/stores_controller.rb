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
    crates = build_crates(store, picks, daily_ids)
    active_crate_slug = "picks"

    render inertia: "stores/featured", props: {
      store: store_props(store, entry["description"]),
      crates:,
      active_crate_slug:,
      current_session: session_props
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

  def store_props(store, description)
    {
      id: store.id,
      name: store.name,
      discogs_username: store.discogs_username,
      description:,
      total_listings: store.total_listings,
      sync_status: store.sync_status
    }
  end

  def session_props
    return nil unless @current_dig_session

    {
      id: @current_dig_session.id,
      name: @current_dig_session.name,
      item_ids: @current_dig_session.dig_session_items.pluck(:listing_id)
    }
  end

  def build_crates(store, picks, daily_ids)
    crates = []

    crates << crate_props("picks", "Milkcrate Picks", picks, @current_dig_session)

    genre_counts = store.listings.pluck(:genres).flatten.tally.sort_by { |_, c| -c }
    scope = daily_ids.any? ? store.listings.where(id: daily_ids) : store.listings
    genre_counts.each do |genre, _|
      genre_listings = scope.by_genre(genre).limit(100).to_a
      crates << crate_props(genre.parameterize, genre, genre_listings, @current_dig_session)
    end

    crates
  end

  def crate_props(slug, name, listings, session)
    pile_ids = session&.dig_session_items&.pluck(:listing_id)&.to_set
    {
      slug:,
      name:,
      count: listings.size,
      records: listings.map { |l| listing_props(l, pile_ids) }
    }
  end

  def listing_props(listing, pile_ids)
    {
      id: listing.id,
      discogs_listing_id: listing.discogs_listing_id,
      artist: listing.artist,
      title: listing.title,
      label: listing.label,
      year: listing.year,
      format: listing.format,
      genres: listing.genres,
      styles: listing.styles,
      condition: listing.condition,
      price: listing.price.to_s,
      currency: listing.currency,
      cover_image_url: listing.cover_image_url,
      thumbnail_url: listing.thumbnail_url,
      notes: listing.notes,
      discogs_url: listing.discogs_url,
      in_pile: pile_ids&.include?(listing.id) || false
    }
  end
end
