class DeltaStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id)
    store = Store.find(store_id)
    StoreSyncService.new(store).delta_sync
    Rails.logger.info("DeltaStoreSync: refreshed #{store.discogs_username}")

    EnrichListingsJob.perform_later(store_id)
  end
end
