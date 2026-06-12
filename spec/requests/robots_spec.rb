require "rails_helper"

RSpec.describe "robots.txt", type: :request do
  it "returns text/plain" do
    get "/robots.txt"
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("text/plain")
  end

  it "allows all crawlers on public routes" do
    get "/robots.txt"
    expect(response.body).to include("User-agent: *")
    expect(response.body).to include("Allow: /")
  end

  it "disallows admin, dashboard, auth, dev, and jobs routes" do
    get "/robots.txt"

    expect(response.body).to include("Disallow: /admin/")
    expect(response.body).to include("Disallow: /dashboard/")
    expect(response.body).to include("Disallow: /auth/")
    expect(response.body).to include("Disallow: /dev/")
    expect(response.body).to include("Disallow: /jobs/")
  end

  it "references the sitemap" do
    get "/robots.txt"
    expect(response.body).to include("Sitemap: https://milkcrate.fm/sitemaps/sitemap.xml.gz")
  end
end
