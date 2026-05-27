# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
  class HiddenGems
    include SelectionPipeline

    MIN_RECORDS     = 4
    PER_GENRE_CAP   = 3
    MAX_ENGAGEMENT  = 100
    MIN_WANTS       = 10

    def initialize(genre_counts:, today: Date.today)
      @scorer       = RecordScorer.new(genre_counts:, today:)
      @genre_counts = genre_counts
    end

    def select(pool, excluded_ids:)
      obscure = find_obscure(pool, excluded_ids:)
      return [] if obscure.size < MIN_RECORDS

      score_and_sort(obscure, excluded_ids: Set.new, scorer: @scorer) { |candidates| candidates }
        .then { |ranked| apply_genre_cap(ranked) }
    end

    private

    def find_obscure(pool, excluded_ids:)
      pool
        .reject { |listing| excluded_ids.include?(listing.id) }
        .select { |listing| obscure_listing?(listing) }
    end

    def obscure_listing?(listing)
      whr = WantHaveRatio.new(listing.want_count.to_i, listing.have_count.to_i)
      return false unless listing.cover_image_url.present? || listing.thumbnail_url.present?
      whr.want >= MIN_WANTS && whr.total <= MAX_ENGAGEMENT && whr.want > whr.have
    end

    def apply_genre_cap(ranked)
      genre_seen = Hash.new(0)
      ranked.select { |listing| under_genre_cap?(listing, genre_seen) }
    end

    def under_genre_cap?(listing, genre_seen)
      genre = listing.primary_genre
      return false unless genre && genre_seen[genre] < PER_GENRE_CAP

      genre_seen[genre] += 1
      true
    end
  end
end
