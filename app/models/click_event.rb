class ClickEvent < ApplicationRecord
  belongs_to :store
  belongs_to :listing, optional: true

  validates :store_id, presence: true
end
