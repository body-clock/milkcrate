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

  def main_counts(listings)
    selection_for(listings).main_counts
  end

  def allocation_order(listings)
    selection_for(listings).allocation_order
  end

  def display_order(listings)
    selection_for(listings).display_order
  end

  def thematic_candidates(listings)
    selection_for(listings).rotation_styles.map { |name|
      StorefrontTheme.style(name)
    }
  end

  private

  def selection_for(listings)
    @_selection_by_hash ||= {}
    @_selection_by_hash[listings.hash] ||= StyleSelection.new(listings)
  end
end
