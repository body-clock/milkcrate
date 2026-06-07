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
end
