# frozen_string_literal: true

# Analyzes a store's genre distribution to determine whether it is
# narrow (genre-specialized, 80%+ in one genre) or broad (distributed).
#
# Used by SeoHelper to generate genre-aware page titles and descriptions.
class GenreDiversityAnalyzer
  NARROW_THRESHOLD = 0.8

  def initialize(store:)
    @store = store
  end

  def call
    return fallback if genre_totals.empty?
    total = genre_totals.values.sum
    dominant, dominant_count = genre_totals.max_by { |_, c| c }
    narrow = dominant_count.to_f / total >= NARROW_THRESHOLD
    { narrow: narrow, dominant_genre: narrow ? dominant : nil, top_genres: top_genres }
  end

  private

  def genre_totals
    @genre_totals ||= listings_query
      .pluck(Arel.sql("unnest(genres)"))
      .each_with_object(Hash.new(0)) { |genre, counts| counts[genre] += 1 }
  end

  def top_genres
    genre_totals.sort_by { |_, c| -c }.first(3).map(&:first)
  end

  def fallback
    { narrow: false, dominant_genre: nil, top_genres: [] }
  end

  def listings_query
    Listing.where(store_id: @store.id)
           .where.not(genres: nil)
           .where.not(genres: [])
  end
end
