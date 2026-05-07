require "digest"
require "digest/md5"

module CrateStrategies
  # Each strategy implements: select(pool, excluded_ids:) -> [Listing]
  # Results are scored via RecordScorer, sorted best-first, and uncapped.
  # The caller applies CRATE_SIZE and wraps results in a CuratedCrate.

  # ---------------------------------------------------------------------------
  # Picks — top records across full inventory, genre-diverse
  # ---------------------------------------------------------------------------
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

  # ---------------------------------------------------------------------------
  # New Arrivals — most-recent window with enough eligible records, then scored
  # ---------------------------------------------------------------------------
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

  # ---------------------------------------------------------------------------
  # Thematic — pick a random style / genre, filter to matches, score
  # ---------------------------------------------------------------------------
  class Thematic
    MIN_RECORDS = 4

    def initialize(store_id:, genre_counts:, today: Date.today)
      @scorer       = RecordScorer.new(genre_counts:, today:)
      @store_id     = store_id
      @today        = today
    end

    # Returns [ name, listings ] when a theme qualifies, or nil.
    def select(pool, excluded_ids:)
      candidates = pool.reject { |listing| excluded_ids.include?(listing.id) }
      return if candidates.empty?

      themes = discover_themes(candidates)
      return if themes.empty?

      theme   = themes[seed % themes.size]
      matched = theme.listings_for(candidates)
      return if matched.size < MIN_RECORDS

      name = theme.name
      scored = matched.map { |listing| [ listing, @scorer.score(listing) ] }
        .sort_by { |_, s| -s }
        .map(&:first)

      [ name, scored ]
    end

    private

    def discover_themes(pool)
      (style_themes(pool) + genre_themes(pool))
        .select { |theme| theme.eligible?(pool) }
        .sort_by(&:slug)
    end

    def style_themes(pool)
      pool.flat_map { |listing| Array(listing.styles) }
        .compact
        .tally
        .keys
        .map { |style| StorefrontTheme.style(style) }
    end

    def genre_themes(pool)
      pool.map(&:primary_genre)
        .compact
        .tally
        .keys
        .map { |genre| StorefrontTheme.genre(genre) }
    end

    def seed
      Digest::MD5.hexdigest("#{@store_id}-#{@today.iso8601}").hex
    end
  end
end
