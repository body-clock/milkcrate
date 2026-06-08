require "rails_helper"

RSpec.describe "Dashboard", type: :request do
  let(:store_owner) { create(:store_owner) }
  let!(:store) do
    create(
      :store,
      store_owner:,
      sync_status: "failed",
      last_sync_error: "RuntimeError: Discogs timeout\napp/jobs/full_store_sync_job.rb:12:in `perform'",
      last_sync_error_at: 1.hour.ago
    )
  end

  before do
    allow_any_instance_of(DashboardController).to receive(:session).and_return(
      ActiveSupport::HashWithIndifferentAccess.new(store_owner_id: store_owner.id)
    )
  end

  describe "GET /dashboard" do
    it "exposes sync error timestamp without raw error details" do
      get "/dashboard"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("dashboard/index")
      expect(inertia.props[:store]["last_sync_error_at"]).to eq(store.last_sync_error_at.iso8601(3))
      expect(inertia.props[:store]).not_to include("last_sync_error_summary", "last_sync_error",
        "discogs_oauth_token", "discogs_oauth_token_secret")
    end
  end

  describe "POST /dashboard/resync" do
    it "queues a single sync for the current store owner" do
      expect {
        post "/dashboard/resync"
      }.to have_enqueued_job(FullStoreSyncJob).with(store.id)

      expect(response).to redirect_to(dashboard_path)
      expect(flash[:notice]).to include("queued")
    end

    it "does not queue another sync when one is already running" do
      store.update!(sync_status: "syncing")

      expect {
        post "/dashboard/resync"
      }.not_to have_enqueued_job(FullStoreSyncJob)

      expect(response).to redirect_to(dashboard_path)
      expect(flash[:alert]).to include("already running")
    end
  end
end
