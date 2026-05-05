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

  def summarized_sync_error(error)
    summary = "#{error.class}: #{error.message}"
    backtrace = Array(error.backtrace).first(8)

    ([ summary ] + backtrace).join("\n")
  end
end
