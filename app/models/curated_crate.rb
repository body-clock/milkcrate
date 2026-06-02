# A curated collection of records surfaced on the storefront — a named
# crate like "The Wall", "New Arrivals", or a genre bin.
class CuratedCrate
  CRATE_SIZE = 50
  MIN_RECORDS = 4

  attr_reader :slug, :name, :listings

  def initialize(slug:, name:, listings:)
    @slug = slug
    @name = name
    @listings = listings
  end

  def viable?
    listings.size >= MIN_RECORDS
  end
end
