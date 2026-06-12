# Admin controller for store-level actions like retrying sync and deletion.
class Admin::StoresController < Admin::BaseController
  def retry_sync
    store = Store.find(params[:id])
    FullStoreSyncJob.perform_later(store.id)
    redirect_to admin_path, notice: "Sync queued for #{store.name}"
  rescue ActiveRecord::RecordNotFound
    redirect_to admin_path, alert: "Store not found"
  end

  def retry_enrichment
    store = Store.find(params[:id])
    EnrichmentJob.perform_later(store.id)
    redirect_to admin_path, notice: "Enrichment queued for #{store.name}"
  rescue ActiveRecord::RecordNotFound
    redirect_to admin_path, alert: "Store not found"
  end

  def destroy
    store = Store.find(params[:id])
    store.destroy!
    redirect_to admin_path, notice: "Deleted #{store.name}"
  rescue ActiveRecord::RecordNotFound
    redirect_to admin_path, alert: "Store not found"
  end
end
