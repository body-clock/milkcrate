class Store < ApplicationRecord
  has_many :listings, dependent: :destroy

  validates :name, presence: true
  validates :discogs_username, presence: true, uniqueness: true

  enum :sync_status, {
    idle: "idle",
    syncing: "syncing",
    failed: "failed"
  }, default: "idle"

  def stale?
    last_synced_at.nil? || last_synced_at < 23.hours.ago
  end
end
