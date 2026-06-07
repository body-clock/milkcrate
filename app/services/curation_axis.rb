# Selects the grouping key for curation surfaces (Wall diversity caps, Genre
# crate filtering). Subclasses encapsulate the field-level differences between
# top-level Discogs genres and sub-genre styles.
class CurationAxis
  def key_for(_listing)
    raise NotImplementedError
  end

  def matches?(_listing, _name)
    raise NotImplementedError
  end

  def tally_from(_listings)
    raise NotImplementedError
  end

  # Hash of {name => count} for styles/genres that qualify for browse crates.
  def main_counts(listings)
    raise NotImplementedError
  end

  # Array of names in the order crates should be built (before dedup).
  def allocation_order(listings)
    raise NotImplementedError
  end

  # Array of names in the order crates should appear in the storefront.
  def display_order(listings)
    raise NotImplementedError
  end

  # Array of StorefrontTheme candidates for the themed featured slot.
  def thematic_candidates(listings)
    raise NotImplementedError
  end
end
