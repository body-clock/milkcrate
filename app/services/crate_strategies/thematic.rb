require "digest"
require "digest/md5"

# Namespace for crate selection strategies that power storefront crates.
module CrateStrategies
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
