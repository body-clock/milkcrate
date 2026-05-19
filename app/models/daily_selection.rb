class DailySelection < ApplicationRecord
  belongs_to :store

  validates :selected_on, presence: true, uniqueness: { scope: :store_id }

  def self.on(store, date = Date.current)
    find_by(store: store, selected_on: date)
  end

  def listings
    store.listings_for_selection(listing_ids)
  end
end
