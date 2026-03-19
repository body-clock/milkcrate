class DigSession < ApplicationRecord
  belongs_to :store
  has_many :dig_session_items, dependent: :destroy
  has_many :listings, through: :dig_session_items

  validates :name, presence: true

  enum :status, {
    active: "active",
    closed: "closed"
  }, default: "active"

  before_validation :set_default_name, on: :create

  def self.current
    active.order(created_at: :desc).first
  end

  def total_price
    listings.sum(:price)
  end

  private

  def set_default_name
    self.name ||= "Dig — #{Time.current.strftime('%B %-d, %Y')}"
  end
end
