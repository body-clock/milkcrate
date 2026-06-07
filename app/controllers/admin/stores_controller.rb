# Admin endpoints for per-store operations and permanent deletion.
#
# Inherits the existing password-plus-TOTP admin boundary.
# Delegates to application-layer request objects; no status-transition
# or job-selection logic lives here.
class Admin::StoresController < Admin::BaseController
  before_action :load_store, only: [:sync, :enrich, :destroy]

  def sync
    result = StoreOperations::QueueSync.call(@store)
    redirect_with_result(result, action_name: "Sync")
  end

  def enrich
    result = StoreOperations::QueueEnrichment.call(@store)
    redirect_with_result(result, action_name: "Enrichment")
  end

  def destroy
    result = StoreOperations::DeleteStore.call(
      params[:id],
      confirmation: params[:confirmation]
    )

    case result.outcome
    when :deleted
      redirect_to admin_path, notice: "Store has been permanently deleted."
    when :mismatch
      redirect_to admin_path, alert: "Store name confirmation did not match."
    when :active
      redirect_to admin_path, alert: "Cannot delete a store that is currently syncing or enriching."
    when :missing
      redirect_to admin_path, alert: "Store not found."
    when :failed
      redirect_to admin_path, alert: "Could not delete the store. Please try again."
    end
  end

  private

  def load_store
    @store = Store.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to admin_path, alert: "Store not found."
  end

  def redirect_with_result(result, action_name:)
    case result.outcome
    when :queued
      redirect_to admin_path, notice: "#{action_name} queued for #{@store.name}."
    when :blocked
      redirect_to admin_path,
        alert: "A #{action_name.downcase} is already running for #{@store.name}. Please wait before requesting another one."
    when :missing
      redirect_to admin_path, alert: "Store not found."
    when :enqueue_failed
      redirect_to admin_path, alert: "#{action_name} could not be queued. Please try again."
    end
  end
end
