# Admin controller for store-level actions like retrying sync.
class Admin::StoresController < Admin::BaseController
  def retry_sync
    store = Store.find(params[:id])
    FullStoreSyncJob.perform_later(store.id)
    redirect_to admin_path, notice: "Sync queued for #{store.name}"
  rescue ActiveRecord::RecordNotFound
    redirect_to admin_path, alert: "Store not found"
  end
end
