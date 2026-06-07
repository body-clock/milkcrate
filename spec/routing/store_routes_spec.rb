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

  describe "admin store routes" do
    it "routes POST /admin/stores/:id/sync to stores#sync" do
      expect(post: "/admin/stores/1/sync").to route_to(
        controller: "admin/stores",
        action: "sync",
        id: "1"
      )
    end

    it "routes POST /admin/stores/:id/enrich to stores#enrich" do
      expect(post: "/admin/stores/1/enrich").to route_to(
        controller: "admin/stores",
        action: "enrich",
        id: "1"
      )
    end

    it "routes DELETE /admin/stores/:id to stores#destroy" do
      expect(delete: "/admin/stores/1").to route_to(
        controller: "admin/stores",
        action: "destroy",
        id: "1"
      )
    end

    it "does not route a GET to /admin/stores/:id/sync" do
      expect(get: "/admin/stores/1/sync").not_to be_routable
    end

    it "does not route a collection path" do
      expect(post: "/admin/stores").not_to be_routable
    end
  end
end
