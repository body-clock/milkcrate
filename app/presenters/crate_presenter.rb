class CratePresenter
  def initialize(store)
    @store = store
  end

  def store_props
    {
      id: @store.id,
      name: @store.name,
      discogs_username: @store.discogs_username,
      description: @store.description,
      total_listings: @store.total_listings,
      sync_status: @store.sync_status
    }
  end

  def build_crates(selector)
    picks = selector.select_picks(count: 12)
    crates = [ crate_props("picks", "Milkcrate Picks", picks) ]

    picks_ids = picks.map(&:id).to_set

    genre_counts = @store.listings.available.lp_only
      .pluck(:genres)
      .map(&:first)
      .compact
      .tally
      .sort_by { |_, c| -c }

    genre_counts.each do |genre, _|
      genre_listings = selector.rank_genre(genre)
        .reject { |l| picks_ids.include?(l.id) }
        .first(50)
      next if genre_listings.empty?
      crates << crate_props(genre.parameterize, genre, genre_listings)
    end

    crates
  end

  private

  def crate_props(slug, name, listings)
    {
      slug:,
      name:,
      count: listings.size,
      records: listings.map { |l| listing_props(l) }
    }
  end

  def listing_props(listing)
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
      discogs_url: listing.discogs_url
    }
  end
end
