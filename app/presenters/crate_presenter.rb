# Serializes curated crate data into Inertia-compatible props for the storefront.
class CratePresenter
  def initialize(store, scorer: nil)
    @store = store
    @scorer = scorer
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
    sections = [ picks_section(groups) ]
    append_featured(sections, groups[:featured])
    sections << { key: "genre_grid", crates: build_crates(groups[:genres]) }
  end

  def picks_section(groups)
    crate = crate_props(groups[:picks].slug, groups[:picks].name, groups[:picks].listings)
    { key: "picks_wall", crate: }
  end

  def append_featured(sections, featured)
    return unless featured.present?
    sections << { key: "featured_crates", crates: build_crates(featured) }
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
    base_listing_props(listing)
      .merge(media_listing_props(listing))
      .merge(enrichment_listing_props(listing))
      .merge(display_listing_props(listing))
  end

  def base_listing_props(listing)
    {
      id: listing.id,
      discogs_listing_id: listing.discogs_listing_id,
      artist: listing.artist,
      title: listing.title,
      label: listing.label,
      year: listing.year,
      condition: listing.condition,
      price: listing.price.to_s
    }
  end

  def media_listing_props(listing)
    {
      format: listing.format,
      cover_image_url: listing.cover_image_url,
      thumbnail_url: listing.thumbnail_url
    }
  end

  def enrichment_listing_props(listing)
    {
      genres: listing.genres,
      styles: listing.styles,
      notes: listing.notes,
      discogs_url: "https://www.discogs.com/sell/item/#{listing.discogs_listing_id}",
      score_breakdown: dev_score_breakdown(listing)
    }
  end

  def display_listing_props(listing)
    {
      currency: listing.currency,
      display_price: format_price(listing.price)
    }
  end

  def format_price(price)
    return "—" unless price
    "$#{'%.2f' % price}"
  end

  def dev_score_breakdown(listing)
    return nil unless Rails.env.development? && @scorer

    @scorer.score_breakdown(listing).transform_keys(&:to_s)
  end
end
