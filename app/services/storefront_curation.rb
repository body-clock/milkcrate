class StorefrontCuration
  def initialize(store)
    @store = store
  end

  def picks
    selector.select_picks(count: 12)
  end

  def genre_crates
    picks_ids = picks.map(&:id).to_set

    genre_counts.filter_map do |genre, _|
      listings = selector.rank_genre(genre)
        .reject { |l| picks_ids.include?(l.id) }
        .first(50)
      next if listings.empty?
      [ genre, listings ]
    end.to_h
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
