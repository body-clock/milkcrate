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
end
