module CrateStrategies
  class HiddenGems
    MIN_RECORDS     = 4
    PER_GENRE_CAP   = 3
    MAX_ENGAGEMENT  = 100
    MIN_WANTS       = 10

    def initialize(genre_counts:, today: Date.today)
      @scorer       = RecordScorer.new(genre_counts:, today:)
      @genre_counts = genre_counts
    end

    def select(pool, excluded_ids:)
      candidates = pool.reject { |listing| excluded_ids.include?(listing.id) }
      return [] if candidates.empty?

      obscure = candidates.select { |listing|
        whr = WantHaveRatio.new(listing.want_count.to_i, listing.have_count.to_i)
        next false unless listing.cover_image_url.present? || listing.thumbnail_url.present?
        whr.want >= MIN_WANTS && whr.total <= MAX_ENGAGEMENT && whr.want > whr.have
      }
      return [] if obscure.size < MIN_RECORDS

      # Rank by pure RecordScorer score. The strategy selects candidates
      # (low engagement, wants > haves, has image), then the scorer determines
      # ordering just like every other crate strategy.
      scored = obscure
        .map { |listing| [ listing, @scorer.score(listing) ] }
        .sort_by { |_, s| -s }
        .map(&:first)

      apply_genre_cap(scored)
    end

    private

    def apply_genre_cap(ranked)
      genre_seen = Hash.new(0)
      ranked.select { |listing|
        genre = listing.primary_genre
        next false unless genre
        count = genre_seen[genre]
        next false if count >= PER_GENRE_CAP
        genre_seen[genre] = count + 1
        true
      }
    end
  end
end
