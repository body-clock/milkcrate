# Store owner dashboard with sync controls, curation preview, and signup flow.
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

  def signup
    email = params[:email]&.strip
    return redirect_to(dashboard_path, alert: "Email is required.") if email.blank?

    current_store_owner.update!(owner_email: email)
    session[:welcome_seen] = true
    redirect_to dashboard_path, notice: "Thanks! We'll keep you updated."
  end
end
