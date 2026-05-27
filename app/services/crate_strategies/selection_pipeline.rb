# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
  # Shared pipeline for the common score-sort-take pattern across crate
  # strategies. Handles exclusion of already-selected IDs, domain filtering
  # (via the block), scorer-based ranking, and descending sort.
  #
  # Strategies include this module and call #score_and_sort with a block
  # that applies their domain-specific filter on the candidate set.
  #
  # Not used by:
  #   - Picks (genre-diversity sort + seed shuffle)
  #   - Thematic (tuple return + multi-step theme discovery)
  module SelectionPipeline
    def score_and_sort(pool, excluded_ids:, scorer:)
      candidates = exclude_and_filter(pool, excluded_ids) { |c| yield(c) }
      rank(candidates, scorer)
    end

    def exclude_and_filter(pool, excluded_ids)
      pool
        .reject { |l| excluded_ids.include?(l.id) }
        .yield_self { |candidates| yield(candidates) }
    end

    def rank(candidates, scorer)
      candidates
        .map { |l| [ l, scorer.score(l) ] }
        .sort_by { |_, s| -s }
        .map(&:first)
    end
  end
end
