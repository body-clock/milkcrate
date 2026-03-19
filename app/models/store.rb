class Store < ApplicationRecord
  has_many :listings, dependent: :destroy
  has_many :dig_sessions, dependent: :destroy

  validates :name, presence: true
  validates :discogs_username, presence: true, uniqueness: true

  enum :sync_status, {
    idle: "idle",
    syncing: "syncing",
    failed: "failed"
  }, default: "idle"

  def synced?
    last_synced_at.present?
  end

  def stale?
    last_synced_at.nil? || last_synced_at < 1.hour.ago
  end
end
