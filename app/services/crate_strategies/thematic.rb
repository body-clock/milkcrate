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
      candidates = reject_excluded(pool, excluded_ids)
      return unless candidates.any?

      result = pick_theme(candidates)
      return unless result

      [ result[0], sort_by_score(result[1]) ]
    end

    private

    def reject_excluded(pool, excluded_ids)
      return pool if excluded_ids.empty?
      pool.reject { |listing| excluded_ids.include?(listing.id) }
    end

    def pick_theme(candidates)
      theme = best_theme(candidates) or return
      matched = theme.listings_for(candidates)
      return if matched.size < MIN_RECORDS

      [ theme.name, matched ]
    end

    def best_theme(candidates)
      themes = discover_themes(candidates)
      return if themes.empty?

      themes[seed % themes.size]
    end

    def sort_by_score(records)
      records
        .map { |listing| [ listing, @scorer.score(listing) ] }
        .sort_by { |_, s| -s }
        .map(&:first)
    end

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
