class StorefrontSnapshot < ApplicationRecord
  # Bump this when the presenter contract changes in a way that invalidates
  # older active snapshot payloads.
  CURRENT_PROPS_SCHEMA_VERSION = 1

  belongs_to :store

  enum :status, {
    generating: "generating",
    ready: "ready",
    failed: "failed"
  }, default: "generating"

  scope :active, -> { where(active: true) }
  scope :ready_snapshots, -> { where(status: "ready") }
  scope :failed_snapshots, -> { where(status: "failed") }
  scope :compatible, -> { where(props_schema_version: CURRENT_PROPS_SCHEMA_VERSION) }
  scope :active_compatible, -> { active.ready_snapshots.compatible }
  scope :latest_successful, -> { ready.order(generated_at: :desc, id: :desc) }

  validates :store, presence: true
  validates :curation_date, presence: true
  validates :status, inclusion: { in: statuses.keys }
  validates :props_schema_version, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :active, inclusion: { in: [ true, false ] }
  validates :crates, :storefront_sections, presence: true, if: :ready?
  validates :generated_at, presence: true, if: :ready?
  validates :failed_at, presence: true, if: :failed?
  validates :failure_message, presence: true, if: :failed?

  validate :active_snapshots_must_be_ready

  def self.active_compatible_for(store)
    store.storefront_snapshots.active_compatible.order(generated_at: :desc, id: :desc).first
  end

  def renderable?
    ready? && compatible? && payload_shape_valid?
  end

  def compatible?
    props_schema_version == CURRENT_PROPS_SCHEMA_VERSION
  end

  def fresh?
    renderable? && curation_date == Date.current && generated_at.present? && generated_at.to_date == Date.current
  end

  def stale?
    renderable? && !fresh?
  end

  private

  def active_snapshots_must_be_ready
    return unless active?
    return if ready?

    errors.add(:status, "must be ready when active")
  end

  def payload_shape_valid?
    crates.is_a?(Array) &&
      storefront_sections.is_a?(Array) &&
      crates.all? { |crate| crate_payload_valid?(crate) } &&
      storefront_sections.all? { |section| section_payload_valid?(section) }
  end

  def crate_payload_valid?(crate)
    crate.is_a?(Hash) &&
      crate["slug"].present? &&
      crate["name"].present? &&
      crate["count"].present? &&
      crate["records"].is_a?(Array)
  end

  def section_payload_valid?(section)
    section.is_a?(Hash) &&
      section["key"].present? &&
      (
        (section["crate"].is_a?(Hash) && crate_payload_valid?(section["crate"])) ||
        (section["crates"].is_a?(Array) && section["crates"].all? { |crate| crate_payload_valid?(crate) })
      )
  end
end
