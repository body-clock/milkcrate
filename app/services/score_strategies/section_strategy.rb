class ScoreStrategies::SectionStrategy
  SMALL_GENRE_THRESHOLD = 5
  SMALL_GENRE_BOOST = 3

  def initialize(genre_counts:)
    @genre_counts = genre_counts
  end

  def score(listing)
    genre_count = @genre_counts.fetch(listing.primary_genre.to_s, 0)
    genre_count < SMALL_GENRE_THRESHOLD ? SMALL_GENRE_BOOST : 0.0
  end
end
