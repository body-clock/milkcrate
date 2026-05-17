class Store < ApplicationRecord
  has_many :listings, dependent: :destroy
  has_many :storefront_snapshots, dependent: :destroy

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

  def stale?
    last_synced_at.nil? || last_synced_at < 23.hours.ago
  end

  def active_storefront_snapshot
    storefront_snapshots.active_compatible.order(generated_at: :desc, id: :desc).first
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

  def mark_enrichment_started!
    update!(enrichment_status: "enriching")
  end

  def mark_enrichment_succeeded!(finished_at: Time.current)
    update!(enrichment_status: "idle", last_enriched_at: finished_at)
  end

  def mark_enrichment_failed!
    update!(enrichment_status: "failed")
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
