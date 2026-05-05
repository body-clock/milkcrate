class StorefrontCuration
  CuratedCrate = Struct.new(:slug, :name, :listings, keyword_init: true)

  def initialize(store)
    @store = store
  end

  def crates
    picks_list = selector.select_picks(count: 12)
    crates = [ CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_list) ]
    picks_ids = picks_list.map(&:id).to_set

    genre_counts.filter_map do |genre, _|
      listings = selector.rank_genre(genre)
        .reject { |listing| picks_ids.include?(listing.id) }
        .first(50)
      next if listings.empty?
      crates << CuratedCrate.new(slug: genre.parameterize, name: genre, listings: listings)
    end

    crates
  end

  def surfaced_listings
    crates.flat_map(&:listings).uniq(&:id)
  end

  private

  def selector
    @selector ||= PicksSelector.new(@store)
  end

  def genre_counts
    @genre_counts ||= @store.listings.available.lp_only
      .pluck(:genres)
      .map(&:first)
      .compact
      .tally
      .sort_by { |_, c| -c }
  end
end
