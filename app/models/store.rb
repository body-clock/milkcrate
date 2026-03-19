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

  def self.rotation
    YAML.load_file(Rails.root.join("config/stores.yml")) rescue []
  end

  def self.featured_on(date = Date.current)
    entries = rotation
    return nil if entries.empty?
    entry = entries[date.to_date.jd % entries.count]
    find_by(discogs_username: entry["username"])
  end

  def self.featured_today
    featured_on(Date.current)
  end

  def synced?
    last_synced_at.present?
  end

  def stale?
    last_synced_at.nil? || last_synced_at < 23.hours.ago
  end
end
