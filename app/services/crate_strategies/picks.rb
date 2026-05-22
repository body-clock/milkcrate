module CrateStrategies
  class Picks
    def initialize(genre_counts:, today: Date.today)
      @scorer  = RecordScorer.new(genre_counts:, today:)
      @policy  = PickPolicy.new
      @today   = today
    end

    def select(pool, excluded_ids:, count: 12)
      scored = pool
        .reject { |listing| excluded_ids.include?(listing.id) }
        .map { |listing| [ listing, @scorer.score(listing) ] }

      shuffle_seed = @today.to_s.sum
      genre_cap    = @policy.genre_cap(count)
      genre_seen   = Hash.new(0)

      scored
        .sort_by { |listing, s| @policy.sort_key(listing, s, shuffle_seed) }
        .filter_map { |listing, _|
          genre = listing.primary_genre
          next if genre_seen[genre] >= genre_cap
          genre_seen[genre] += 1
          listing
        }
        .uniq(&:id)
        .first(count)
    end
  end
end
