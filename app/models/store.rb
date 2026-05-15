class Store < ApplicationRecord
  has_many :listings, dependent: :destroy

  before_validation :normalize_discogs_username, if: :discogs_username_changed?

  validates :name, presence: true
  validates :discogs_username, presence: true, uniqueness: true

  # Uses LOWER() for safety during transition — existing data may not yet be normalized.
  # Can simplify to `where(discogs_username: username.downcase)` after the
  # milkcrate:normalize_usernames rake task has been run in production.
  scope :with_discogs_username, ->(username) { where("LOWER(discogs_username) = LOWER(?)", username) }

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

  def stale?
    last_synced_at.nil? || last_synced_at < 23.hours.ago
  end

  def mark_sync_succeeded!(attributes = {})
    update!(
      {
        sync_status: "idle",
        last_sync_error: nil,
        last_sync_error_at: nil
      }.merge(attributes)
    )
  end

  def mark_sync_failed!(error)
    update!(
      sync_status: "failed",
      last_sync_error: summarized_sync_error(error),
      last_sync_error_at: Time.current
    )
  end

  private

  def normalize_discogs_username
    self.discogs_username = discogs_username&.downcase
  end

  def summarized_sync_error(error)
    summary = "#{error.class}: #{error.message}"
    backtrace = Array(error.backtrace).first(8)

    ([ summary ] + backtrace).join("\n")
  end
end
