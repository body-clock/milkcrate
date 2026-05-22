module CrateStrategies
  # Genre — records from a single genre, scored and sorted. One instance per
  # genre, instantiated per-curation cycle. Exclusion tracking is the caller's
  # responsibility (prevents the same record appearing in multiple genre crates).
  class Genre
    MIN_RECORDS = 4

    def initialize(genre:, genre_counts:, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
      @genre  = genre
    end

    def select(pool, excluded_ids:)
      candidates = pool
        .reject { |listing| excluded_ids.include?(listing.id) }
        .select { |listing| listing.primary_genre == @genre }

      return [] if candidates.size < MIN_RECORDS

      candidates
        .map { |listing| [ listing, @scorer.score(listing) ] }
        .sort_by { |_, s| -s }
        .first(CuratedCrate::CRATE_SIZE)
        .map(&:first)
    end
  end
end
