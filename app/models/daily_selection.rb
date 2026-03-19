class DailySelection < ApplicationRecord
  belongs_to :store

  validates :selected_on, presence: true, uniqueness: { scope: :store_id }

  def self.on(store, date = Date.current)
    find_by(store: store, selected_on: date)
  end

  def self.listing_ids_for(store, date = Date.current)
    on(store, date)&.listing_ids || []
  end

  def listings
    store.listings.where(id: listing_ids)
  end
end
