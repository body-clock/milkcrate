module CrateStrategies
  class HiddenGems
    MIN_RECORDS     = 4
    PER_GENRE_CAP   = 3
    MAX_ENGAGEMENT  = 100
    MIN_WANTS       = 10

    def initialize(genre_counts:)
      @genre_counts = genre_counts
    end

    def select(pool, excluded_ids:)
      candidates = pool.reject { |listing| excluded_ids.include?(listing.id) }
      return [] if candidates.empty?

      desirable = candidates.select { |listing|
        want = listing.want_count.to_i
        have = listing.have_count.to_i
        has_image = listing.cover_image_url.present? || listing.thumbnail_url.present?
        has_image && want >= MIN_WANTS && want + have <= MAX_ENGAGEMENT && want > have
      }
      return [] if desirable.size < MIN_RECORDS

      ranked = desirable.sort_by { |listing| -want_have_ratio(listing) }
      apply_genre_cap(ranked)
    end

    private

    def want_have_ratio(listing)
      want = listing.want_count.to_i
      have = listing.have_count.to_i
      return want.to_f if have.zero?
      want.to_f / have
    end

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
