class DailyCurationJob < ApplicationJob
  queue_as :default

  def perform(store_id = nil)
    stores = store_id ? [ Store.find(store_id) ] : Store.all
    stores.each { |store| DailyCurationService.new.curate(store) }
  end
end
