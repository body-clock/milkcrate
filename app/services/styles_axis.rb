class StylesAxis < CurationAxis
  def key_for(listing)
    listing.styles.first
  end

  def matches?(listing, name)
    Array(listing.styles).include?(name)
  end

  def tally_from(listings)
    listings.flat_map(&:styles).compact.tally
  end
end
