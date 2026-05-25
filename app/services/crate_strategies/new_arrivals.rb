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

      WINDOWS.each do |days|
        cutoff = days.days.ago
        recent = candidates.select { |listing| listing.listed_at.present? && listing.listed_at >= cutoff }
        next if recent.size < MIN_RECORDS

        return score_and_sort(recent, excluded_ids: Set.new, scorer: @scorer) { |c| c }
      end

      score_and_sort(candidates, excluded_ids: Set.new, scorer: @scorer) { |c| c }
    end
  end
end
