require "rails_helper"

RSpec.describe "store routes", type: :routing do
  it "routes Discogs-style usernames to store pages" do
    expect(get: "/test-store_123").to route_to(
      controller: "stores",
      action: "show",
      slug: "test-store_123"
    )
  end

  it "does not route browser icon probes to store invitations" do
    expect(get: "/apple-touch-icon.png").not_to be_routable
  end
end
