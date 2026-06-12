require "rails_helper"

RSpec.describe "Admin::Stores", type: :request do
  describe "POST /admin/stores/:id/retry" do
    it "redirects to login when not authenticated" do
      store = create(:store, name: "Test Store", discogs_username: "test-store")

      post admin_store_retry_sync_path(store)

      expect(response).to redirect_to(admin_login_path)
    end

    it "enqueues a FullStoreSyncJob and redirects with notice" do
      sign_in_admin
      store = create(:store, name: "Retry Store", discogs_username: "retry-store")

      expect {
        post admin_store_retry_sync_path(store)
      }.to have_enqueued_job(FullStoreSyncJob).with(store.id)

      expect(response).to redirect_to(admin_path)
      expect(flash[:notice]).to eq("Sync queued for Retry Store")
    end

    it "redirects with alert when store does not exist" do
      sign_in_admin

      post admin_store_retry_sync_path(id: 0)

      expect(response).to redirect_to(admin_path)
      expect(flash[:alert]).to eq("Store not found")
    end
  end

  describe "POST /admin/stores/:id/retry_enrichment" do
    it "enqueues an EnrichmentJob and redirects with notice" do
      sign_in_admin
      store = create(:store, name: "Enrich Store", discogs_username: "enrich-store")

      expect {
        post admin_store_retry_enrichment_path(store)
      }.to have_enqueued_job(EnrichmentJob).with(store.id)

      expect(response).to redirect_to(admin_path)
      expect(flash[:notice]).to eq("Enrichment queued for Enrich Store")
    end

    it "redirects with alert when store does not exist" do
      sign_in_admin

      post admin_store_retry_enrichment_path(id: 0)

      expect(response).to redirect_to(admin_path)
      expect(flash[:alert]).to eq("Store not found")
    end
  end

  describe "DELETE /admin/stores/:id" do
    it "destroys the store and redirects with notice" do
      sign_in_admin
      store = create(:store, name: "Delete Me", discogs_username: "delete-me")

      expect {
        delete admin_store_path(store)
      }.to change(Store, :count).by(-1)

      expect(response).to redirect_to(admin_path)
      expect(flash[:notice]).to eq("Deleted Delete Me")
    end

    it "redirects with alert when store does not exist" do
      sign_in_admin

      delete admin_store_path(id: 0)

      expect(response).to redirect_to(admin_path)
      expect(flash[:alert]).to eq("Store not found")
    end
  end
end
