class Listing < ApplicationRecord
  belongs_to :store
  has_many :dig_session_items, dependent: :destroy
  has_many :dig_sessions, through: :dig_session_items

  VINYL_FORMATS = %w[Vinyl LP EP Single].freeze

  scope :vinyl, -> { where("format ILIKE ANY (ARRAY[?])", VINYL_FORMATS.map { |f| "%#{f}%" }) }
  scope :by_genre, ->(genre) { where("? = ANY(genres)", genre) }
  scope :recent, -> { order(listed_at: :desc) }
  scope :new_arrivals, -> { recent.limit(50) }
  # Deterministic daily shuffle — same order within a day, different each day
  scope :daily_shuffle, -> { order(Arel.sql("MD5(discogs_listing_id || '#{Date.current}'::text)")) }

  def primary_genre
    genres.first
  end

  def display_price
    return "—" unless price
    "$#{'%.2f' % price}"
  end

  def discogs_url
    "https://www.discogs.com/sell/item/#{discogs_listing_id}"
  end
end
