# Store owner dashboard with sync controls and curation preview.
class DashboardController < SessionAuthenticatedController
  layout "inertia_application"

  def index
    render inertia: "dashboard/index", props: DashboardPresenter.new(current_store).props
  end

  def resync
    return redirect_to(dashboard_path,
      alert: "A sync is already running for your store. Please wait before requesting another one.") if current_store.sync_syncing?

    FullStoreSyncJob.perform_later(current_store.id)
    redirect_to dashboard_path, notice: "Full inventory sync has been queued."
  end
end
