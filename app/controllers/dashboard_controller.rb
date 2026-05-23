class DashboardController < ApplicationController
  layout "inertia_application"

  before_action :require_store_owner

  def index
    render inertia: "dashboard/index", props: DashboardPresenter.new(current_store).props
  end

  def resync
    CsvExportSyncJob.perform_later(current_store.id)
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

  private

  def require_store_owner
    owner_id = session[:store_owner_id]
    @current_store_owner = StoreOwner.find_by(id: owner_id)

    unless @current_store_owner&.oauth_authorized?
      redirect_to root_path, alert: "Please claim your store first."
    end
  end

  def current_store_owner
    @current_store_owner
  end

  def current_store
    @current_store ||= @current_store_owner&.stores&.first
  end
end
