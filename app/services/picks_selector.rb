require_relative "record_scorer"

class PicksSelector
  POOL_SIZE = 100

  def initialize(store, today: Date.today)
    @store = store
    @today = today
  end

  # Returns listings for picks crate: top records across the full inventory,
  # genre-diverse, freshness-adjusted.
  def select_picks(count: 12, seed: nil)
    scored = score_all
    shuffle_seed = seed || @today.to_s.sum

    # Genre-diverse: cap per-genre representation
    genre_cap = [ count / 3, 2 ].max
    genre_seen = Hash.new(0)

    scored
      .sort_by { |listing, s| [ -s, Digest::MD5.hexdigest("#{listing.id}#{shuffle_seed}") ] }
      .filter_map { |listing, _|
        genre = listing.primary_genre
        next if genre_seen[genre] >= genre_cap
        genre_seen[genre] += 1
        listing
      }
      .uniq(&:id)
      .first(count)
  end

  # Returns all scored listings for a genre, sorted best-first.
  # Used by genre bins — operates on full inventory, not a daily pick subset.
  def rank_genre(genre)
    score_all
      .select { |listing, _| listing.primary_genre == genre }
      .sort_by { |_, s| -s }
      .map(&:first)
  end

  private

  def score_all(listing_ids: nil)
    return scored_inventory.select { |l, _| listing_ids.include?(l.id) } if listing_ids&.any?
    scored_inventory
  end

  def scored_inventory
    @scored_inventory ||= begin
      listings = @store.listings.available.lp_only.to_a
      gc = store_genre_counts
      scorer = RecordScorer.new(genre_counts: gc, today: @today)
      listings.map { |l| [ l, scorer.score(l) ] }
    end
  end

  def store_genre_counts
    @store_genre_counts ||= @store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
  end
end
