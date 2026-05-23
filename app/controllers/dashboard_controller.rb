# Store owner dashboard with sync controls, curation preview, and signup flow.
class DashboardController < SessionAuthenticatedController
  layout "inertia_application"

  def index
    render inertia: "dashboard/index", props: DashboardPresenter.new(current_store).props
  end

  def resync
    if current_store.sync_syncing?
      redirect_to dashboard_path, alert: "A sync is already running for your store. Please wait before requesting another one."
      return
    end

    FullStoreSyncJob.perform_later(current_store.id)
    redirect_to dashboard_path, notice: "Full inventory sync has been queued."
  end

  def signup
    email = params[:email]&.strip
    if email.blank?
      redirect_to dashboard_path, alert: "Email is required."
      return
    end

    current_store_owner.update!(owner_email: email)
    session[:welcome_seen] = true
    redirect_to dashboard_path, notice: "Thanks! We'll keep you updated."
  end
end
