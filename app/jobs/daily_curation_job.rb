# Job that runs daily curation for a store (surfacing, cache pre-warm).
class DailyCurationJob < ApplicationJob
  queue_as :default

  def perform(store_id = nil)
    stores = store_id ? resolve_store(store_id) : Store.all
    stores.each { |store| DailyCurationService.new.curate(store) }
  end

  private

  def resolve_store(store_id)
    [ Store.find(store_id) ]
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn("[DailyCurationJob] store=#{store_id} not found, skipping")
    []
  end
end
