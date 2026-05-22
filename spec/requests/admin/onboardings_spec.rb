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

  describe "POST /admin/onboarding" do
    it "requires admin credentials" do
      post "/admin/onboarding", params: { discogs_username: "new-store" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "calls store onboarding with no waitlist and redirects to admin" do
      result = StoreOnboarding::Result.new(store: build_stubbed(:store, name: "New Store", discogs_username: "new-store"))
      allow(StoreOnboarding).to receive(:call).and_return(result)

      post "/admin/onboarding",
        params: { discogs_username: " New-Store " },
        headers: auth_headers("admin", "secret")

      expect(StoreOnboarding).to have_received(:call).with(discogs_username: "new-store", waitlist: nil)
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued for New Store")
    end

    it "does not call onboarding when matching store already exists" do
      create(:store, discogs_username: "existing-store")
      allow(StoreOnboarding).to receive(:call)

      post "/admin/onboarding",
        params: { discogs_username: "Existing-Store" },
        headers: auth_headers("admin", "secret")

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("already exists")
    end

    it "does not call onboarding when matching applicant already exists" do
      create(:waitlist, discogs_username: "applicant-store")
      allow(StoreOnboarding).to receive(:call)

      post "/admin/onboarding",
        params: { discogs_username: "Applicant-Store" },
        headers: auth_headers("admin", "secret")

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("already has an applicant")
    end

    it "does not call onboarding when username is blank" do
      allow(StoreOnboarding).to receive(:call)

      post "/admin/onboarding",
        params: { discogs_username: " " },
        headers: auth_headers("admin", "secret")

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("Discogs username is required")
    end

    it "shows an alert when direct onboarding fails" do
      allow(StoreOnboarding).to receive(:call).and_raise(StoreOnboarding::Error, "Discogs lookup failed")

      post "/admin/onboarding",
        params: { discogs_username: "broken-store" },
        headers: auth_headers("admin", "secret")

      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("Discogs lookup failed")
    end

    it "creates a store and queues sync work through the real onboarding operation" do
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("direct-store").and_return({ "name" => "Direct Store" })

      expect {
        post "/admin/onboarding",
          params: { discogs_username: "Direct-Store" },
          headers: auth_headers("admin", "secret")
      }.to change(Store, :count).by(1)
        .and have_enqueued_job(FullStoreSyncJob)

      expect(Store.last).to have_attributes(name: "Direct Store", discogs_username: "direct-store")
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued for Direct Store")
    end

    it "keeps applicant approval as the path for waitlist records" do
      waitlist = create(:waitlist, discogs_username: "applicant-store")
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("applicant-store").and_return({ "name" => "Applicant Store" })

      expect {
        post "/admin/waitlists/#{waitlist.id}/onboarding", headers: auth_headers("admin", "secret")
      }.to change(Store, :count).by(1)
        .and have_enqueued_job(FullStoreSyncJob)

      expect(Store.last).to have_attributes(name: "Applicant Store", discogs_username: "applicant-store")
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued for Applicant Store")
    end
  end
end
