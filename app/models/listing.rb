# A vinyl record listing imported from a store Discogs inventory.
class Listing < ApplicationRecord
  belongs_to :store

  VINYL_FORMATS = %w[Vinyl LP EP Single].freeze

  # 12" albums only — requires explicit LP or Album in format string.
  # Excludes unenriched records (format="Vinyl" only) intentionally — they
  # lack genre/style data and shouldn't surface on the wall or in genre bins.
  LP_FORMAT_TERMS = %w[LP Album].freeze
  NON_VINYL_FORMAT_TERMS = [ "8-Track", "8-Trk", "Cass", "Cassette", "CD", "DVD", "VHS", "Blu-ray", "SACD", "Reel" ].freeze
  scope :by_genre, ->(genre) { where("? = ANY(genres)", genre) }
  scope :recent, -> { order(listed_at: :desc) }
  scope :new_arrivals, -> { recent.limit(50) }
  scope :daily_shuffle, -> { order(Arel.sql("MD5(discogs_listing_id || '#{Date.current}'::text)")) }

  # Listings absent from latest sync are assumed sold. Never-synced stores fall
  # back to recent activity until first successful inventory snapshot lands.
  scope :available, -> { Listings::AvailableQuery.new(relation: all).call }

  def primary_genre
    genres.first
  end

  def sort_key
    want_count = self.want_count || 0
    have_count = self.have_count || 0
    timestamp = listed_at&.to_i || last_seen_at&.to_i || 0

    [ -want_count, -have_count, -timestamp ]
  end

  def self.vinyl
    where(format_matches_any(VINYL_FORMATS))
  end

  def self.lp_only
    where(format_matches_any(LP_FORMAT_TERMS).and(format_matches_any(NON_VINYL_FORMAT_TERMS).not))
  end

  def self.format_matches_any(terms)
    terms
      .map { |term| arel_table[:format].matches("%#{sanitize_sql_like(term)}%", nil, false) }
      .reduce { |predicate, term_match| predicate.or(term_match) }
  end
  private_class_method :format_matches_any
end
