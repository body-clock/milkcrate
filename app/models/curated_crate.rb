# A curated collection of records surfaced on the storefront — a named
# crate like "Milkcrate Picks", "New Arrivals", or a genre bin.
class CuratedCrate
  attr_reader :slug, :name, :listings

  def initialize(slug:, name:, listings:)
    @slug = slug
    @name = name
    @listings = listings
  end
end
