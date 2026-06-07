# Store owner dashboard with sync controls and curation preview.
class DashboardController < SessionAuthenticatedController
  layout "inertia_application"

  def index
    render inertia: "dashboard/index", props: DashboardPresenter.new(current_store).props
  end

  def resync
    result = StoreOperations::QueueSync.call(current_store)

    case result.outcome
    when :queued
      redirect_to dashboard_path, notice: "Full inventory sync has been queued."
    when :blocked
      redirect_to dashboard_path,
        alert: "A sync is already running for your store. Please wait before requesting another one."
    when :missing
      redirect_to dashboard_path, alert: "Store not found."
    when :enqueue_failed
      redirect_to dashboard_path, alert: "Sync could not be queued. Please try again."
    end
  end
end
