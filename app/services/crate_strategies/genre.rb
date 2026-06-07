# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
  # Genre — records from a single genre, scored and sorted. One instance per
  # genre, instantiated per-curation cycle. Exclusion tracking is the caller's
  # responsibility (prevents the same record appearing in multiple genre crates).
  class Genre
    include SelectionPipeline

    MIN_RECORDS = 4

    def initialize(genre:, genre_counts:, curation_axis: GenresAxis.new, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
      @genre  = genre
      @curation_axis = curation_axis
    end

    def select(pool, excluded_ids:)
      candidates = score_and_sort(pool, excluded_ids:, scorer: @scorer) do |candidates|
        candidates.select { |l| @curation_axis.matches?(l, @genre) }
      end

      return [] if candidates.size < MIN_RECORDS

      candidates.first(CuratedCrate::CRATE_SIZE)
    end
  end
end
