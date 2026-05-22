class Store < ApplicationRecord
  has_many :listings, dependent: :destroy

  before_validation :normalize_discogs_username, if: :discogs_username_changed?

  validates :name, presence: true
  validates :discogs_username, presence: true, uniqueness: true

  scope :with_discogs_username, ->(username) { where(discogs_username: username.downcase) }

  enum :sync_status, {
    idle: "idle",
    syncing: "syncing",
    failed: "failed"
  }, default: "idle", prefix: "sync"

  enum :catalog_coverage, {
    unknown: "unknown",
    near_complete: "near_complete",
    partial: "partial"
  }, default: "unknown"

  enum :enrichment_status, {
    idle: "idle",
    enriching: "enriching",
    failed: "failed"
  }, default: "idle", prefix: "enrichment"

  enum :sync_source, {
    public_api: "public_api",
    csv_export: "csv_export"
  }, default: "public_api", prefix: "sync_source"

  def oauth_authorized?
    discogs_oauth_token.present? && discogs_oauth_token_secret.present? && oauth_authorized_at.present?
  end

  def listings_for_selection(listing_ids)
    listings.where(id: listing_ids)
  end

  private

  def normalize_discogs_username
    self.discogs_username = discogs_username&.downcase
  end
end
