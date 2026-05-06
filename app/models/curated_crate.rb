# A curated collection of records surfaced on the storefront — a named
# crate like "Milkcrate Picks", "New Arrivals", or a genre bin.
class CuratedCrate
  attr_reader :slug, :name, :listings

  def initialize(slug:, name:, listings:)
    @slug = slug
    @name = name
    @listings = listings
  end

  def ==(other)
    other.is_a?(CuratedCrate) &&
      slug == other.slug &&
      name == other.name &&
      listings == other.listings
  end
  alias eql? ==

  def hash
    [ self.class, slug, name, listings ].hash
  end
end
