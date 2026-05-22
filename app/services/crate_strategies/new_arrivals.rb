module CrateStrategies
  class NewArrivals
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
        return scored_sorted(recent) if recent.size >= MIN_RECORDS
      end

      scored_sorted(candidates)
    end

    private

    def scored_sorted(listings)
      listings
        .map { |listing| [ listing, @scorer.score(listing) ] }
        .sort_by { |_, s| -s }
        .map(&:first)
    end
  end
end
