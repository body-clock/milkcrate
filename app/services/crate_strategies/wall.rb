# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
  class Wall
    def initialize(genre_counts:, today: Date.today)
      @scorer  = RecordScorer.new(genre_counts:, today:)
      @policy  = WallPolicy.new
      @today   = today
    end

    def select(pool, excluded_ids:, count: 12)
      scored = score_pool(pool, excluded_ids:)
      select_by_diversity(scored, count:)
    end

    private

    def score_pool(pool, excluded_ids:)
      pool
        .reject { |listing| excluded_ids.include?(listing.id) }
        .map { |listing| [ listing, @scorer.score(listing) ] }
    end

    def select_by_diversity(scored, count:)
      score_sorter(scored)
        .filter_map(&genre_cap_filter(count))
        .uniq(&:id)
        .first(count)
    end

    def genre_cap_filter(count)
      genre_cap = @policy.genre_cap(count)
      genre_seen = Hash.new(0)
      ->(entry) { apply_genre_cap(entry.first, genre_cap:, genre_seen:) }
    end

    def score_sorter(scored)
      shuffle_seed = @today.to_s.sum
      scored.sort_by { |listing, s| @policy.sort_key(listing, s, shuffle_seed) }
    end

    def apply_genre_cap(listing, genre_cap:, genre_seen:)
      genre = listing.primary_genre
      return if genre_seen[genre] >= genre_cap

      genre_seen[genre] += 1
      listing
    end
  end
end
