# Boosts records released before 1980. Vintage records are inherently more
# collectible — limited pressings, older source material, and a smaller pool of
# available copies on Discogs. The 1980 cutoff is a practical boundary:
# pre-1980 pressing plants were fewer and production runs smaller, so surviving
# copies carry a scarcity premium. This is a static threshold (not a rolling
# window) to keep the vintage signal stable regardless of the current year.
class ScoreStrategies::VintageStrategy
  VINTAGE_BEFORE = 1980

  def score(listing)
    listing.year && listing.year < VINTAGE_BEFORE ? 2.0 : 0.0
  end
end
