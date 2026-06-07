# Store owner dashboard with sync controls and curation preview.
class DashboardController < SessionAuthenticatedController
  layout "inertia_application"

  def index
    render inertia: "dashboard/index", props: DashboardPresenter.new(current_store).props
  end

  def resync
    result = StoreOperations::QueueSync.call(current_store)
    redirect_to dashboard_path, sync_flash(result.outcome)
  end

  private

  def sync_flash(outcome)
    msgs = { queued: { notice: "Full inventory sync has been queued." },
             blocked: { alert: "A sync is already running for your store. Please wait before requesting another one." },
             missing: { alert: "Store not found." } }
    msgs.fetch(outcome) { { alert: "Sync could not be queued. Please try again." } }
  end
end
