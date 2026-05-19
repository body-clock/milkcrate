class ScoreStrategies::VintageStrategy
  VINTAGE_BEFORE = 1980

  def score(listing)
    listing.year && listing.year < VINTAGE_BEFORE ? 2.0 : 0.0
  end
end
