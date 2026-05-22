# Boosts records priced $10+ by 1 point. Higher-priced records are both more
# commercially valuable (higher AOV) and tend to be more collectible/interesting,
# making them worth surfacing in crates. This is a pure boost: records under
# the threshold or with no price get 0, not a penalty.
class ScoreStrategies::PriceStrategy
  PRICE_THRESHOLD = 5.00
  PRICE_BOOST = 1.0

  def score(listing)
    listing.price && listing.price >= PRICE_THRESHOLD ? PRICE_BOOST : 0.0
  end
end
