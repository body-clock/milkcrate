require "rails_helper"

RSpec.describe "Admin::StoreOperations", type: :request do
  let(:store) { create(:store, sync_status: "idle", enrichment_status: "idle") }

  describe "POST /admin/stores/:id/sync" do
    it "redirects to login when not authenticated" do
      post "/admin/stores/#{store.id}/sync"

      expect(response).to redirect_to(admin_login_path)
    end

    it "redirects to TOTP when password-authenticated but TOTP-unverified" do
      admin = create(:admin_user, :with_totp)
      password = "test-admin-password-123"
      admin.update!(password:, password_confirmation: password)
      post admin_login_path, params: { session: { email: admin.email, password: } }

      post "/admin/stores/#{store.id}/sync"

      expect(response).to redirect_to(admin_totp_path)
    end

    context "when fully authenticated" do
      before { sign_in_admin }

      it "queues sync and redirects with a success notice" do
        allow(StoreOperations::QueueSync).to receive(:call).with(store).and_return(
          StoreOperations::QueueSync::Result.new(:queued)
        )

        post "/admin/stores/#{store.id}/sync"

        expect(StoreOperations::QueueSync).to have_received(:call).with(store)
        expect(response).to redirect_to(admin_path)
        expect(flash[:notice]).to include("Sync queued")
      end

      it "redirects with an alert when sync is blocked" do
        allow(StoreOperations::QueueSync).to receive(:call).with(store).and_return(
          StoreOperations::QueueSync::Result.new(:blocked)
        )

        post "/admin/stores/#{store.id}/sync"

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("already running")
      end

      it "redirects with an alert when the store is missing" do
        allow(StoreOperations::QueueSync).to receive(:call).and_return(
          StoreOperations::QueueSync::Result.new(:missing)
        )

        post "/admin/stores/99999/sync"

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("Store not found")
      end

      it "redirects with an alert on enqueue failure" do
        allow(StoreOperations::QueueSync).to receive(:call).with(store).and_return(
          StoreOperations::QueueSync::Result.new(:enqueue_failed)
        )

        post "/admin/stores/#{store.id}/sync"

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("could not be queued")
      end
    end
  end

  describe "POST /admin/stores/:id/enrich" do
    it "redirects to login when not authenticated" do
      post "/admin/stores/#{store.id}/enrich"

      expect(response).to redirect_to(admin_login_path)
    end

    context "when fully authenticated" do
      before { sign_in_admin }

      it "queues enrichment and redirects with a success notice" do
        allow(StoreOperations::QueueEnrichment).to receive(:call).with(store).and_return(
          StoreOperations::QueueEnrichment::Result.new(:queued)
        )

        post "/admin/stores/#{store.id}/enrich"

        expect(StoreOperations::QueueEnrichment).to have_received(:call).with(store)
        expect(response).to redirect_to(admin_path)
        expect(flash[:notice]).to include("Enrichment queued")
      end

      it "redirects with an alert when enrichment is blocked" do
        allow(StoreOperations::QueueEnrichment).to receive(:call).with(store).and_return(
          StoreOperations::QueueEnrichment::Result.new(:blocked)
        )

        post "/admin/stores/#{store.id}/enrich"

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("already running")
      end

      it "redirects with an alert when the store is missing" do
        post "/admin/stores/99999/enrich"

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("Store not found")
      end

      it "redirects with an alert on enqueue failure" do
        allow(StoreOperations::QueueEnrichment).to receive(:call).with(store).and_return(
          StoreOperations::QueueEnrichment::Result.new(:enqueue_failed)
        )

        post "/admin/stores/#{store.id}/enrich"

        expect(response).to redirect_to(admin_path)
        expect(flash[:alert]).to include("could not be queued")
      end
    end
  end
end
