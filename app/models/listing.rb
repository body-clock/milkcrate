class Listing < ApplicationRecord
  belongs_to :store

  VINYL_FORMATS = %w[Vinyl LP EP Single].freeze

  # 12" albums only — requires explicit LP or Album in format string.
  # Excludes unenriched records (format="Vinyl" only) intentionally — they
  # lack genre/style data and shouldn't surface in picks or genre bins.
  LP_FORMAT_TERMS = %w[LP Album].freeze

  VINYL_FORMAT_SQL   = VINYL_FORMATS.map { |f| "format ILIKE '%#{f}%'" }.join(" OR ").freeze
  LP_ONLY_FORMAT_SQL = LP_FORMAT_TERMS.map { |f| "format ILIKE '%#{f}%'" }.join(" OR ").freeze

  scope :vinyl,   -> { where(Arel.sql(VINYL_FORMAT_SQL)) }
  scope :lp_only, -> { where(Arel.sql(LP_ONLY_FORMAT_SQL)) }
  scope :by_genre, ->(genre) { where("? = ANY(genres)", genre) }
  scope :recent, -> { order(listed_at: :desc) }
  scope :new_arrivals, -> { recent.limit(50) }
  scope :daily_shuffle, -> { order(Arel.sql("MD5(discogs_listing_id || '#{Date.current}'::text)")) }

  # Listings absent from the last sync are assumed sold
  scope :available, -> { where("last_seen_at > ?", 3.days.ago) }

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
