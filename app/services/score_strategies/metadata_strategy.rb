# Penalizes listings with insufficient metadata. A record that lacks styles, has
# only a single genre, and has no year is effectively a shell record — it
# arrived from Discogs as a bare listing (often "Vinyl" format only) and
# hasn't been enriched yet. These listings can't be categorized into thematic
# crates, their genre-placement is ambiguous, and they look unfinished to
# customers. The -1.0 penalty is mild enough that a truly desirable record
# (high want/have) can still surface, but ensures well-enriched listings are
# preferred when scores are close. This is a penalty-only strategy: complete
# metadata is the baseline expectation, not a bonus.
class ScoreStrategies::MetadataStrategy
  def score(listing)
    listing.styles.empty? && listing.genres.size <= 1 && listing.year.nil? ? -1.0 : 0.0
  end
end
