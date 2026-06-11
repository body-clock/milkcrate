module SeoHelper
  def seo_title(store)
    "#{store.name} Vinyl Records — Milkcrate"
  end

  def seo_description(store)
    count = store.total_listings || store.listings.count
    "Browse #{store.name}'s curated vinyl collection on Milkcrate — #{count} records. Discover records like a digger, not a search engine."
  end

  def seo_store_json_ld(store)
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: store.name,
      description: store.description.presence || seo_description(store),
      url: store_url(store.discogs_username),
      image: default_og_image,
      offers: {
        "@type": "AggregateOffer",
        offerCount: store.total_listings || store.listings.count,
        priceCurrency: "USD"
      }
    }.to_json.html_safe
  end

  def default_og_image
    "#{request.base_url}/icon.svg"
  end
end
