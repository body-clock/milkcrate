class CratePresenter
  def initialize(store)
    @store = store
  end

  def store_props
    {
      id: @store.id,
      name: @store.name,
      discogs_username: @store.discogs_username,
      description: @store.description,
      total_listings: @store.total_listings,
      sync_status: @store.sync_status
    }
  end

  def build_crates(curated_crates)
    curated_crates.map do |crate|
      crate_props(crate.slug, crate.name, crate.listings)
    end
  end

  private

  def crate_props(slug, name, listings)
    {
      slug:,
      name:,
      count: listings.size,
      records: listings.map { |l| listing_props(l) }
    }
  end

  def listing_props(listing)
    {
      id: listing.id,
      discogs_listing_id: listing.discogs_listing_id,
      artist: listing.artist,
      title: listing.title,
      label: listing.label,
      year: listing.year,
      format: listing.format,
      genres: listing.genres,
      styles: listing.styles,
      condition: listing.condition,
      price: listing.price.to_s,
      currency: listing.currency,
      cover_image_url: listing.cover_image_url,
      thumbnail_url: listing.thumbnail_url,
      notes: listing.notes,
      discogs_url: listing.discogs_url
    }
  end
end
