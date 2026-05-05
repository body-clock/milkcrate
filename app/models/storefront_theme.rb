class StorefrontTheme
  FEATURED_MIN_RECORDS = 4
  FEATURED_CRATE_SIZE = 4

  attr_reader :slug, :name

  def self.style(name)
    new(
      slug: "style-#{name.parameterize}",
      name:,
      matcher: ->(listing) { Array(listing.styles).include?(name) }
    )
  end

  def self.genre(name)
    new(
      slug: "genre-#{name.parameterize}",
      name:,
      matcher: ->(listing) { listing.primary_genre == name }
    )
  end

  def initialize(slug:, name:, matcher:)
    @slug = slug
    @name = name
    @matcher = matcher
  end

  def eligible?(pool)
    listings_for(pool).size >= FEATURED_MIN_RECORDS
  end

  def crate_for(pool, slug: self.slug)
    StorefrontCuration::CuratedCrate.new(
      slug:,
      name:,
      listings: listings_for(pool).first(FEATURED_CRATE_SIZE)
    )
  end

  def listings_for(pool)
    pool.select { |listing| matches?(listing) }
      .sort_by { |listing| sort_key(listing) }
  end

  private

  def matches?(listing)
    @matcher.call(listing)
  end

  def sort_key(listing)
    want_count = listing.want_count || 0
    have_count = listing.have_count || 0
    timestamp = listing.listed_at&.to_i || listing.last_seen_at&.to_i || 0

    [ -want_count, -have_count, -timestamp ]
  end
end
