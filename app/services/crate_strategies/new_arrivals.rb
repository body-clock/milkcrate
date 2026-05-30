# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
  class NewArrivals
    include SelectionPipeline

    WINDOWS     = [ 7, 14, 30, 90, 365 ].freeze
    MIN_RECORDS = 4

    def initialize(genre_counts:, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
    end

    def select(pool, excluded_ids:)
      candidates = pool.reject { |listing| excluded_ids.include?(listing.id) }
      return [] if candidates.empty?

      selected = select_from_windows(candidates)
      selected || score_and_sort(candidates, excluded_ids: Set.new, scorer: @scorer) { |c| c }
    end

    private

    def select_from_windows(candidates)
      WINDOWS.each { |days| return try_window(candidates, days) if window_qualifies?(candidates, days) }
      nil
    end

    def window_qualifies?(candidates, days)
      recent_in_window(candidates, days).size >= MIN_RECORDS
    end

    def try_window(candidates, days)
      score_and_sort(recent_in_window(candidates, days), excluded_ids: Set.new, scorer: @scorer) { |c| c }
    end

    def recent_in_window(candidates, days)
      cutoff = days.days.ago
      candidates.select { |listing| listing.listed_at.present? && listing.listed_at >= cutoff }
    end
  end
end
