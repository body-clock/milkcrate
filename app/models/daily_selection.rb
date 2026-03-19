class DailySelection < ApplicationRecord
  belongs_to :store

  validates :selected_on, presence: true, uniqueness: { scope: :store_id }

  def self.on(store, date = Date.current)
    find_by(store: store, selected_on: date)
  end

  def self.fetch_or_generate(store, date = Date.current)
    on(store, date) || DailySelectionService.new(store).generate(date: date)
  end

  def listings
    store.listings.where(id: listing_ids)
  end
end
