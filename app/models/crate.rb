# frozen_string_literal: true

# The Crate model, which belongs to a User and has many Records
class Crate < ApplicationRecord
  belongs_to :user
  has_many :records, dependent: :destroy
end
