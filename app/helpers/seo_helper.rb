module SeoHelper
  def seo_title(store)
    diversity = genre_diversity(store)
    diversity[:narrow] ? narrow_title(store, diversity[:dominant_genre]) : broad_title(store)
  end

  def seo_description(store)
    diversity = genre_diversity(store)
    desc = diversity[:narrow] ? narrow_description(store, diversity) : broad_description(store, diversity)
    desc += I18n.t("pages.seo.store.location_suffix", location: store.location) if store.location.present?
    desc
  end

  def seo_store_json_ld(store)
    diversity = genre_diversity(store)

    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: store.name,
      description: store.description.presence || seo_description(store),
      url: store_url(store.discogs_username),
      image: default_og_image,
      keywords: diversity[:top_genres].join(", "),
      offers: {
        "@type": "AggregateOffer",
        offerCount: store.total_listings || store.listings.count,
        priceCurrency: "USD"
      }
    }.to_json.html_safe
  end

  def seo_home_json_ld
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Milkcrate",
      url: root_url,
      sameAs: root_url
    }.to_json.html_safe
  end

  def seo_explore_json_ld(stores)
    items = stores.map.with_index(1) do |store, i|
      s = store.with_indifferent_access
      {
        "@type": "ListItem",
        position: i,
        item: {
          "@type": "LocalBusiness",
          name: s[:name],
          url: store_url(s[:discogs_username])
        }
      }
    end

    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: items
    }.to_json.html_safe
  end

  def default_og_image
    "#{request.base_url}/icon.svg"
  end

  private

  def narrow_title(store, genre)
    I18n.t("pages.seo.store.narrow_title", store_name: store.name, genre: genre)
  end

  def broad_title(store)
    I18n.t("pages.seo.store.broad_title", store_name: store.name)
  end

  def narrow_description(store, diversity)
    count = ActiveSupport::NumberHelper.number_to_delimited(listing_count(store))
    genre = diversity[:dominant_genre].downcase
    I18n.t("pages.seo.store.narrow_description", store_name: store.name, genre: genre, count: count)
  end

  def broad_description(store, diversity)
    count = ActiveSupport::NumberHelper.number_to_delimited(listing_count(store))
    genres = diversity[:top_genres]
    key = genres.any? ? "broad_description" : "broad_description_no_genres"
    I18n.t("pages.seo.store.#{key}", store_name: store.name, count: count, genres: genres.join(", "))
  end

  def listing_count(store)
    count = store.total_listings
    count = store.listings.count if count.nil? || count.zero?
    count
  end

  def genre_diversity(store)
    @genre_diversity ||= {}
    @genre_diversity[store.id] ||= GenreDiversityAnalyzer.new(store: store).call
  end
end
