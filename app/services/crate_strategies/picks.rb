# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
  class Picks
    def initialize(genre_counts:, today: Date.today)
      @scorer  = RecordScorer.new(genre_counts:, today:)
      @policy  = PickPolicy.new
      @today   = today
    end

    def select(pool, excluded_ids:, count: 12)
      scored = score_pool(pool, excluded_ids:)
      select_by_diversity(scored, count:)
    end

    def score_pool(pool, excluded_ids:)
      pool
        .reject { |listing| excluded_ids.include?(listing.id) }
        .map { |listing| [ listing, @scorer.score(listing) ] }
    end

    def select_by_diversity(scored, count:)
      shuffle_seed = @today.to_s.sum
      score_sorter(scored, shuffle_seed)
        .filter_map { |listing, _| apply_genre_cap(listing) }
        .uniq(&:id)
        .first(count)
    end

    def score_sorter(scored, shuffle_seed)
      genre_cap = @policy.genre_cap(scored.size)
      @genre_seen = Hash.new(0)
      scored.sort_by { |listing, s| @policy.sort_key(listing, s, shuffle_seed) }
    end

    def apply_genre_cap(listing)
      genre = listing.primary_genre
      return listing unless genre
      return if @genre_seen[genre] >= @policy.genre_cap(12)
      @genre_seen[genre] += 1
      listing
    end
  end
end
