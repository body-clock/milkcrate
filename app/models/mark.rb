# frozen_string_literal: true

# A mark is a timestamp in the parent record
class Mark < ApplicationRecord
  belongs_to :record
  validates :timestamp, presence: true
end
