# Transforms store + listing data into the props contract expected
# by the Inertia featured page React component.
class CratePresenter
  def initialize(store, current_session: nil)
    @store = store
    @current_session = current_session
  end

  def store_props(description)
    {
      id: @store.id,
      name: @store.name,
      discogs_username: @store.discogs_username,
      description:,
      total_listings: @store.total_listings,
      sync_status: @store.sync_status
    }
  end

  def session_props
    return nil unless @current_session

    {
      id: @current_session.id,
      name: @current_session.name,
      item_ids: @current_session.dig_session_items.pluck(:listing_id)
    }
  end

  def build_crates(picks, daily_ids)
    crates = []
    crates << crate_props("picks", "Milkcrate Picks", picks)

    selector = PicksSelector.new(@store)
    genre_counts = @store.listings.pluck(:genres).flatten.tally.sort_by { |_, c| -c }
    scope = daily_ids.any? ? @store.listings.where(id: daily_ids) : @store.listings

    genre_counts.each do |genre, _|
      genre_listing_ids = scope.by_genre(genre).pluck(:id)
      genre_listings = selector.rank(listing_ids: genre_listing_ids)
      crates << crate_props(genre.parameterize, genre, genre_listings)
    end

    crates
  end

  private

  def crate_props(slug, name, listings)
    pile_ids = @current_session&.dig_session_items&.pluck(:listing_id)&.to_set
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
