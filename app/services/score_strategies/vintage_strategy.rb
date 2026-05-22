# Boosts records released between 1960 and 1979. Vintage records are inherently
# more collectible — limited pressings, older source material, and a smaller pool
# of available copies on Discogs. The 1960 lower bound avoids boosting very old
# records (1940s-50s) that are obscure rather than collectible. The 1980 cutoff
# reflects when pressing plants scaled up and production runs grew.
class ScoreStrategies::VintageStrategy
  VINTAGE_AFTER = 1960
  VINTAGE_BEFORE = 1980

  def score(listing)
    listing.year && listing.year >= VINTAGE_AFTER && listing.year < VINTAGE_BEFORE ? 1.0 : 0.0
  end
end
