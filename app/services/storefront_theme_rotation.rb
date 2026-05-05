require "digest/md5"

class StorefrontThemeRotation
  Selection = Struct.new(:theme, :pool, keyword_init: true) do
    def crate
      theme.crate_for(pool, slug: "thematic")
    end
  end

  def initialize(store, listings: nil, today: Time.zone.today)
    @store = store
    @listings = listings
    @today = today
  end

  def select(excluded_ids:)
    pool = eligible_listings.reject { |listing| excluded_ids.include?(listing.id) }
    candidates = candidates_for(pool)
    return if candidates.empty?

    Selection.new(theme: candidates[seed % candidates.size], pool:)
  end

  private

  def candidates_for(pool)
    (style_candidates(pool) + genre_candidates(pool))
      .select { |theme| theme.eligible?(pool) }
      .sort_by(&:slug)
  end

  def style_candidates(pool)
    pool.flat_map { |listing| Array(listing.styles) }
      .compact
      .tally
      .keys
      .map { |style| StorefrontTheme.style(style) }
  end

  def genre_candidates(pool)
    pool.map(&:primary_genre)
      .compact
      .tally
      .keys
      .map { |genre| StorefrontTheme.genre(genre) }
  end

  def eligible_listings
    @eligible_listings ||= @listings || @store.listings.available.lp_only.to_a
  end

  def seed
    Digest::MD5.hexdigest("#{@store.id}-#{@today.iso8601}").hex
  end
end
