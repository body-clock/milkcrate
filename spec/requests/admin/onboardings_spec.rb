require "rails_helper"

RSpec.describe "Admin::Onboardings", type: :request do
  around do |example|
    ENV["ADMIN_HTTP_BASIC_USER"] = "admin"
    ENV["ADMIN_HTTP_BASIC_PASSWORD"] = "secret"
    example.run
  ensure
    ENV.delete("ADMIN_HTTP_BASIC_USER")
    ENV.delete("ADMIN_HTTP_BASIC_PASSWORD")
  end

  describe "POST /admin/waitlists/:waitlist_id/onboarding" do
    it "requires admin credentials" do
      waitlist = create(:waitlist)

      post "/admin/waitlists/#{waitlist.id}/onboarding"

      expect(response).to have_http_status(:unauthorized)
    end

    it "calls store onboarding and redirects to admin" do
      waitlist = create(:waitlist, discogs_username: "new-store")
      result = StoreOnboarding::Result.new(store: build_stubbed(:store, discogs_username: "new-store"))
      allow(StoreOnboarding).to receive(:call).and_return(result)

      post "/admin/waitlists/#{waitlist.id}/onboarding", headers: auth_headers("admin", "secret")

      expect(StoreOnboarding).to have_received(:call).with(discogs_username: "new-store", waitlist:)
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued")
    end

    it "does not call onboarding when matching store already exists" do
      waitlist = create(:waitlist, discogs_username: "existing-store")
      create(:store, discogs_username: "existing-store")
      allow(StoreOnboarding).to receive(:call)

      post "/admin/waitlists/#{waitlist.id}/onboarding", headers: auth_headers("admin", "secret")

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("already exists")
    end

    it "shows an alert when onboarding fails" do
      waitlist = create(:waitlist, discogs_username: "broken-store")
      allow(StoreOnboarding).to receive(:call).and_raise(StoreOnboarding::Error, "Discogs username is required")

      post "/admin/waitlists/#{waitlist.id}/onboarding", headers: auth_headers("admin", "secret")

      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("Discogs username is required")
    end
  end

  def auth_headers(username, password)
    credentials = Base64.strict_encode64("#{username}:#{password}")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end
end
