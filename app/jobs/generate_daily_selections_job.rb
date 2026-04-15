class GenerateDailySelectionsJob < ApplicationJob
  queue_as :default

  def perform(date: Date.current)
    store = Store.featured_on(date)
    return Rails.logger.warn("[GenerateDailySelectionsJob] No stores in rotation") unless store

    selection = DailySelectionService.new(store).generate(date: date)
    EnrichListingsJob.perform_later(store.id, listing_ids: selection.listing_ids)
  rescue => e
    Rails.logger.error "[GenerateDailySelectionsJob] Failed for store #{store&.id}: #{e.message}"
  end
end
