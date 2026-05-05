class Store < ApplicationRecord
  has_many :listings, dependent: :destroy

  validates :name, presence: true
  validates :discogs_username, presence: true, uniqueness: true

  enum :sync_status, {
    idle: "idle",
    syncing: "syncing",
    failed: "failed"
  }, default: "idle"

  enum :catalog_coverage, {
    unknown: "unknown",
    near_complete: "near_complete",
    partial: "partial"
  }, default: "unknown"

  def stale?
    last_synced_at.nil? || last_synced_at < 23.hours.ago
  end
end
