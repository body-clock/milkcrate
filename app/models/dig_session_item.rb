class DigSessionItem < ApplicationRecord
  belongs_to :dig_session
  belongs_to :listing

  validates :listing_id, uniqueness: { scope: :dig_session_id }
end
