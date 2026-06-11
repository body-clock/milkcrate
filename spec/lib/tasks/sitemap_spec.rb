require "rails_helper"

RSpec.describe "sitemap", type: :request do
  around do |example|
    SitemapGenerator::Sitemap.default_host = "https://milkcrate.fm"
    SitemapGenerator::Sitemap.public_path = "tmp/"
    SitemapGenerator::Sitemap.sitemaps_path = "sitemaps-test/"
    SitemapGenerator::Sitemap.create_index = false
    example.run
    FileUtils.rm_rf(Rails.root.join("tmp", "sitemaps-test"))
  end

  def generate_sitemap
    SitemapGenerator::Sitemap.create(verbose: false) do
      add "/", changefreq: "daily", priority: 1.0
      add "/explore", changefreq: "daily", priority: 0.9

      Store.find_each do |store|
        add store_path(store.discogs_username),
            lastmod: store.updated_at,
            changefreq: "daily",
            priority: 0.8
      end
    end
  end

  def sitemap_xml
    generate_sitemap
    files = Dir.glob(Rails.root.join("tmp", "sitemaps-test", "*.xml*").to_s)
    return "" if files.empty?
    file = files.first
    if file.end_with?(".gz")
      Zlib::GzipReader.open(file, &:read)
    else
      File.read(file)
    end
  end

  it "includes home and explore pages" do
    create(:store, name: "Test Store", discogs_username: "teststore")

    xml = sitemap_xml

    expect(xml).to include("<loc>https://milkcrate.fm</loc>")
    expect(xml).to include("<loc>https://milkcrate.fm/explore</loc>")
  end

  it "includes all active stores" do
    create(:store, name: "Alpha", discogs_username: "alpha")
    create(:store, name: "Beta", discogs_username: "beta")

    xml = sitemap_xml

    expect(xml).to include("<loc>https://milkcrate.fm/alpha</loc>")
    expect(xml).to include("<loc>https://milkcrate.fm/beta</loc>")
  end

  it "does not include apply, admin, or dashboard routes" do
    create(:store, name: "Test Store", discogs_username: "teststore")

    xml = sitemap_xml

    expect(xml).not_to include("/apply")
    expect(xml).not_to include("/admin")
    expect(xml).not_to include("/dashboard")
  end

  it "sets correct priority and changefreq on home page" do
    create(:store, name: "Test Store", discogs_username: "teststore")

    xml = sitemap_xml

    expect(xml).to include("<priority>1.0</priority>")
    expect(xml).to include("<changefreq>daily</changefreq>")
  end
end
