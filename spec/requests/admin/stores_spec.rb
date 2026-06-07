require "rails_helper"

RSpec.describe "Admin::Stores", type: :request do
  let(:store) { create(:store, discogs_username: "delete-test") }

  describe "DELETE /admin/stores/:id" do
    it "redirects to login when not authenticated" do
      delete "/admin/stores/#{store.id}", params: { confirmation: "delete-test" }

      expect(response).to redirect_to(admin_login_path)
    end

    it "redirects to TOTP when password-authenticated but TOTP-unverified" do
      admin = create(:admin_user, :with_totp)
      password = "test-admin-password-123"
      admin.update!(password:, password_confirmation: password)
      post admin_login_path, params: { session: { email: admin.email, password: } }

      delete "/admin/stores/#{store.id}", params: { confirmation: "delete-test" }

      expect(response).to redirect_to(admin_totp_path)
    end

    context "when fully authenticated" do
      before { sign_in_admin }

      it "deletes the store and redirects with a success notice" do
        delete "/admin/stores/#{store.id}", params: { confirmation: "delete-test" }

        expect(Store.find_by(id: store.id)).to be_nil
        expect(response).to redirect_to(admin_path)
        expect(flash[:notice]).to eq("Store has been permanently deleted.")
      end

      it "redirects with an alert when confirmation does not match" do
        delete "/admin/stores/#{store.id}", params: { confirmation: "wrong-name" }

        expect(Store.find_by(id: store.id)).to be_present
        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to eq("Store name confirmation did not match.")
      end

      it "redirects with an alert when the store is syncing" do
        store.update!(sync_status: :syncing)

        delete "/admin/stores/#{store.id}", params: { confirmation: "delete-test" }

        expect(Store.find_by(id: store.id)).to be_present
        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("currently syncing or enriching")
      end

      it "redirects with an alert when the store is enriching" do
        store.update!(enrichment_status: :enriching)

        delete "/admin/stores/#{store.id}", params: { confirmation: "delete-test" }

        expect(Store.find_by(id: store.id)).to be_present
        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("currently syncing or enriching")
      end

      it "redirects with an alert when the store does not exist" do
        delete "/admin/stores/99999", params: { confirmation: "anything" }

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to eq("Store not found.")
      end

      it "redirects with an alert when deletion fails" do
        allow(StoreOperations::DeleteStore).to receive(:call).and_return(
          StoreOperations::DeleteStore::Result.new(:failed)
        )

        delete "/admin/stores/#{store.id}", params: { confirmation: "delete-test" }

        expect(Store.find_by(id: store.id)).to be_present
        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to eq("Could not delete the store. Please try again.")
      end
    end
  end
end
