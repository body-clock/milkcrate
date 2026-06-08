# Job that runs daily curation for a store (surfacing, cache pre-warm).
class DailyCurationJob < ApplicationJob
  limits_concurrency to: 1, key: ->(store_id = nil) { "daily_curation_#{store_id || 'batch'}" }
  queue_as :default

  def perform(store_id = nil)
    stores = store_id ? [ Store.find(store_id) ] : Store.all
    stores.each { |store| DailyCurationService.new.curate(store) }
  end
end
