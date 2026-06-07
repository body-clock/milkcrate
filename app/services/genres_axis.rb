class GenresAxis < CurationAxis
  def key_for(listing)
    listing.primary_genre
  end

  def matches?(listing, name)
    listing.primary_genre == name
  end

  def tally_from(listings)
    listings.map(&:primary_genre).compact.tally
  end

  def main_counts(listings)
    tally_from(listings)
  end

  def allocation_order(listings)
    main_counts(listings).sort_by { |name, count| [-count, name] }.map(&:first)
  end

  def display_order(listings)
    allocation_order(listings)
  end

  def thematic_candidates(listings)
    style_themes(listings) + genre_themes(listings)
  end

  private

  def style_themes(listings)
    listings.flat_map { |l| Array(l.styles) }
      .compact
      .tally
      .keys
      .map { |style| StorefrontTheme.style(style) }
  end

  def genre_themes(listings)
    tally_from(listings)
      .keys
      .map { |genre| StorefrontTheme.genre(genre) }
  end
end
