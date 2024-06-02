# frozen_string_literal: true

# The Record model, which belongs to a Crate and has many marks
class Record < ApplicationRecord
  belongs_to :crate
  has_many :marks, dependent: :destroy
end
