# frozen_string_literal: true

SitemapGenerator::Sitemap.default_host = "https://milkcrate.fm"
SitemapGenerator::Sitemap.sitemaps_path = "sitemaps/"
SitemapGenerator::Sitemap.create_index = :auto

SitemapGenerator::Sitemap.create(include_root: false) do
  add "/", changefreq: "daily", priority: 1.0
  add "/explore", changefreq: "daily", priority: 0.9

  Store.find_each do |store|
    add store_path(store.discogs_username),
        lastmod: store.updated_at,
        changefreq: "daily",
        priority: 0.8
  end
end
