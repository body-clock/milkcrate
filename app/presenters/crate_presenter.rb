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
      sync_status: @store.sync_status,
      last_sync_error_at: @store.last_sync_error_at,
      enrichment_status: @store.enrichment_status,
      last_enriched_at: @store.last_enriched_at
    }
  end

  def build_crates(curated_crates)
    curated_crates.map do |crate|
      crate_props(crate.slug, crate.name, crate.listings)
    end
  end

  def build_storefront_sections(groups)
    sections = [
      {
        key: "picks_wall",
        crate: crate_props(groups[:picks].slug, groups[:picks].name, groups[:picks].listings)
      }
    ]

    if groups[:featured].present?
      sections << { key: "featured_crates", crates: build_crates(groups[:featured]) }
    end

    sections << { key: "genre_grid", crates: build_crates(groups[:genres]) }
    sections
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
      discogs_url: "https://www.discogs.com/sell/item/#{listing.discogs_listing_id}",
      display_price: format_price(listing.price)
    }
  end

  def format_price(price)
    return "—" unless price
    "$#{'%.2f' % price}"
  end
end
