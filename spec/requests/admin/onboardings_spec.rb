require "rails_helper"

RSpec.describe "Admin::Onboardings", type: :request do
  describe "POST /admin/waitlists/:waitlist_id/onboarding" do
    it "redirects to login when not authenticated" do
      waitlist = create(:waitlist)

      post "/admin/waitlists/#{waitlist.id}/onboarding"

      expect(response).to redirect_to(admin_login_path)
    end

    it "calls store onboarding and redirects to admin" do
      sign_in_admin
      waitlist = create(:waitlist, discogs_username: "new-store")
      result = StoreOnboarding::Result.new(store: build_stubbed(:store, discogs_username: "new-store"))
      allow(StoreOnboarding).to receive(:call).and_return(result)

      post "/admin/waitlists/#{waitlist.id}/onboarding"

      expect(StoreOnboarding).to have_received(:call).with(discogs_username: "new-store", waitlist:)
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued")
    end

    it "does not call onboarding when matching store already exists" do
      sign_in_admin
      waitlist = create(:waitlist, discogs_username: "existing-store")
      create(:store, discogs_username: "existing-store")
      allow(StoreOnboarding).to receive(:call)

      post "/admin/waitlists/#{waitlist.id}/onboarding"

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("already exists")
    end

    it "shows an alert when onboarding fails" do
      sign_in_admin
      waitlist = create(:waitlist, discogs_username: "broken-store")
      allow(StoreOnboarding).to receive(:call).and_raise(StoreOnboarding::Error, "Discogs username is required")

      post "/admin/waitlists/#{waitlist.id}/onboarding"

      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("Discogs username is required")
    end
  end

  describe "POST /admin/onboarding" do
    it "redirects to login when not authenticated" do
      post "/admin/onboarding", params: { discogs_username: "new-store" }

      expect(response).to redirect_to(admin_login_path)
    end

    it "calls store onboarding with no waitlist and redirects to admin" do
      sign_in_admin
      result = StoreOnboarding::Result.new(store: build_stubbed(:store, name: "New Store", discogs_username: "new-store"))
      allow(StoreOnboarding).to receive(:call).and_return(result)

      post "/admin/onboarding", params: { discogs_username: " New-Store " }

      expect(StoreOnboarding).to have_received(:call).with(discogs_username: "new-store", waitlist: nil)
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued for New Store")
    end

    it "does not call onboarding when matching store already exists" do
      sign_in_admin
      create(:store, discogs_username: "existing-store")
      allow(StoreOnboarding).to receive(:call)

      post "/admin/onboarding", params: { discogs_username: "Existing-Store" }

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("already exists")
    end

    it "does not call onboarding when matching applicant already exists" do
      sign_in_admin
      create(:waitlist, discogs_username: "applicant-store")
      allow(StoreOnboarding).to receive(:call)

      post "/admin/onboarding", params: { discogs_username: "Applicant-Store" }

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("already has an applicant")
    end

    it "does not call onboarding when username is blank" do
      sign_in_admin
      allow(StoreOnboarding).to receive(:call)

      post "/admin/onboarding", params: { discogs_username: " " }

      expect(StoreOnboarding).not_to have_received(:call)
      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("Discogs username is required")
    end

    it "shows an alert when direct onboarding fails" do
      sign_in_admin
      allow(StoreOnboarding).to receive(:call).and_raise(StoreOnboarding::Error, "Discogs lookup failed")

      post "/admin/onboarding", params: { discogs_username: "broken-store" }

      expect(response).to redirect_to("/admin")
      expect(flash[:alert]).to include("Discogs lookup failed")
    end

    it "creates a store and queues sync work through the real onboarding operation" do
      sign_in_admin
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("direct-store").and_return({ "name" => "Direct Store" })

      expect {
        post "/admin/onboarding", params: { discogs_username: "Direct-Store" }
      }.to change(Store, :count).by(1)
        .and have_enqueued_job(FullStoreSyncJob)

      expect(Store.last).to have_attributes(name: "Direct Store", discogs_username: "direct-store")
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued for Direct Store")
    end

    it "keeps applicant approval as the path for waitlist records" do
      sign_in_admin
      waitlist = create(:waitlist, discogs_username: "applicant-store")
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("applicant-store").and_return({ "name" => "Applicant Store" })

      expect {
        post "/admin/waitlists/#{waitlist.id}/onboarding"
      }.to change(Store, :count).by(1)
        .and have_enqueued_job(FullStoreSyncJob)

      expect(Store.last).to have_attributes(name: "Applicant Store", discogs_username: "applicant-store")
      expect(response).to redirect_to("/admin")
      expect(flash[:notice]).to include("Onboarding queued for Applicant Store")
    end
  end
end
