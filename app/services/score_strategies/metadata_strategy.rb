class ScoreStrategies::MetadataStrategy
  def score(listing)
    listing.styles.empty? && listing.genres.size <= 1 && listing.year.nil? ? -1.0 : 0.0
  end
end
