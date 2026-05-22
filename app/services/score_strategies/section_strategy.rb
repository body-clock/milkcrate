# Boosts records from small genre sections (fewer than 5 listings in the
# current store's inventory). This creates variety in crates: without it,
# large genres like Rock or Electronic would dominate every section, and
# customers browsing by genre would see the same names repeatedly.
# Small-genre boost acts as a diversity mechanism — it surfaces Jazz,
# Reggae, Folk, and Classical records that would otherwise be buried.
# The threshold (5) and boost value (3) are calibrated so a single small-genre
# record can outrank multiple medium-quality Rock picks, ensuring each crate
# has breadth across the store's catalog.
class ScoreStrategies::SectionStrategy
  SMALL_GENRE_THRESHOLD = 5
  SMALL_GENRE_BOOST = 2

  def initialize(genre_counts:)
    @genre_counts = genre_counts
  end

  def score(listing)
    genre_count = @genre_counts.fetch(listing.primary_genre.to_s, 0)
    genre_count < SMALL_GENRE_THRESHOLD ? SMALL_GENRE_BOOST : 0.0
  end
end
