class ListingEvent < ApplicationRecord
  VALID_TYPES = %w[record_view discogs_click pile_add].freeze

  belongs_to :listing
  belongs_to :store

  validates :event_type, inclusion: { in: VALID_TYPES }
  validates :listing_id, :store_id, presence: true

  self.ignored_columns += [ "updated_at" ]
end
