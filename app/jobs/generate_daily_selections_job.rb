class GenerateDailySelectionsJob < ApplicationJob
  queue_as :default

  def perform(date: Date.current)
    store = Store.featured_on(date)
    return Rails.logger.warn("[GenerateDailySelectionsJob] No stores in rotation") unless store

    DailySelectionService.new(store).generate(date: date)
  rescue => e
    Rails.logger.error "[GenerateDailySelectionsJob] Failed for store #{store&.id}: #{e.message}"
  end
end
