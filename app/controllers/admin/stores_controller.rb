# Admin endpoints for per-store operations and permanent deletion.
#
# Inherits the existing password-plus-TOTP admin boundary.
# Delegates to application-layer request objects; no status-transition
# or job-selection logic lives here.
class Admin::StoresController < Admin::BaseController
  before_action :load_store, only: [ :sync, :enrich, :destroy ]

  def sync
    result = StoreOperations::QueueSync.call(@store)
    redirect_to admin_path, operation_flash(result.outcome, "Sync")
  end

  def enrich
    result = StoreOperations::QueueEnrichment.call(@store)
    redirect_to admin_path, operation_flash(result.outcome, "Enrichment")
  end

  def destroy
    result = StoreOperations::DeleteStore.call(params[:id], confirmation: params[:confirmation])
    redirect_to admin_path, delete_flash(result.outcome)
  end

  private

  def load_store
    @store = Store.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to admin_path, alert: "Store not found."
  end

  def operation_flash(outcome, action)
    msgs = { queued: { notice: "#{action} queued for #{@store.name}." },
             blocked: { alert: "A #{action.downcase} is already running for #{@store.name}. Please wait before requesting another one." },
             missing: { alert: "Store not found." } }
    msgs.fetch(outcome) { { alert: "#{action} could not be queued. Please try again." } }
  end

  def delete_flash(outcome)
    msgs = { deleted: { notice: "Store has been permanently deleted." },
             mismatch: { alert: "Store name confirmation did not match." },
             active: { alert: "Cannot delete a store that is currently syncing or enriching." },
             missing: { alert: "Store not found." } }
    msgs.fetch(outcome) { { alert: "Could not delete the store. Please try again." } }
  end
end
