# Boosts records priced $20+ by 1 point for the Wall crate. Wall records at a
# record store are typically higher-value picks — more curated, more collectible,
# and priced accordingly. This is a flat boost layered on top of the general
# price strategy (which boosts $10+ records) so expensive records get extra
# signal for Wall placement specifically.
class ScoreStrategies::WallPriceStrategy
  WALL_PRICE_THRESHOLD = 20.00
  WALL_PRICE_BOOST = 1.0

  def score(listing)
    listing.price && listing.price >= WALL_PRICE_THRESHOLD ? WALL_PRICE_BOOST : 0.0
  end
end
