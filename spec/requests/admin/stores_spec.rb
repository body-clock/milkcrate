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
end
