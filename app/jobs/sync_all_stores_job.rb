# Job that triggers FullStoreSyncJob for every active store.
class SyncAllStoresJob < ApplicationJob
  queue_as :default

  STAGGER_INTERVAL = 5.minutes

  def perform
    Store.find_each.with_index do |store, index|
      FullStoreSyncJob
        .set(wait: STAGGER_INTERVAL * index)
        .perform_later(store.id)
    end
  end
end
