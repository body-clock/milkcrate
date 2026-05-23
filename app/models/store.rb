class Store < ApplicationRecord
  belongs_to :store_owner, optional: true

  has_many :listings, dependent: :destroy

  before_validation :normalize_discogs_username, if: :discogs_username_changed?

  validates :name, presence: true
  validates :discogs_username, presence: true, uniqueness: true

  scope :with_discogs_username, ->(username) { where(discogs_username: username.downcase) }

  delegate :discogs_oauth_token, :discogs_oauth_token_secret, :oauth_authorized_at,
    to: :store_owner, allow_nil: true

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
    store_owner&.oauth_authorized? || false
  end

  def listings_for_selection(listing_ids)
    listings.where(id: listing_ids)
  end

  def sync_strategy
    if oauth_authorized?
      SyncStrategies::CsvExport.new
    else
      SyncStrategies::PublicApi.new
    end
  end

  private

  def normalize_discogs_username
    self.discogs_username = discogs_username&.downcase
  end
end
