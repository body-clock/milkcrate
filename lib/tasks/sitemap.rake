# frozen_string_literal: true

namespace :sitemap do
  desc "Generate sitemap.xml.gz and ping search engines"
  task refresh: :environment do
    load Rails.root.join("config/sitemap.rb")
    SitemapGenerator::Sitemap.ping_search_engines
  end
end
