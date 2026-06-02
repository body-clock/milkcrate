# Encapsulates the Wall selection policy: genre diversity, shuffle seeding, and genre caps.
class WallPolicy
  # Maximum selections from any single genre to ensure diversity.
  # At least 2 per genre, at most count/3.
  def genre_cap(count)
    [ count / 3, 2 ].max
  end

  # Sort key for wall selections: highest score first, then deterministic shuffle by seed.
  # Returns a sort-by array suitable for Enumerable#sort_by.
  def sort_key(listing, score, seed)
    [ -score, Digest::MD5.hexdigest("#{listing.id}#{seed}") ]
  end
end
