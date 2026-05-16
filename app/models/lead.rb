class Lead < ApplicationRecord
  before_validation :normalize_discogs_username, if: :discogs_username_changed?

  validates :discogs_username, presence: true, uniqueness: { case_sensitive: false }
  validates :status, presence: true

  scope :with_discogs_username, ->(username) { where(discogs_username: username.to_s.downcase) }
  scope :by_status, ->(status) { where(status: status) }
  scope :scored_above, ->(threshold) { where(arel_table[:score].gt(threshold)) }
  scope :with_web_presence, -> { where.not(web_presence: nil) }
  scope :newest_first, -> { order(created_at: :desc) }
  scope :by_score, -> { order(score: :desc) }

  enum :status, {
    pending: "pending",
    reviewed: "reviewed",
    contacted: "contacted",
    onboarded: "onboarded",
    dismissed: "dismissed"
  }, default: :pending, validate: true

  def needs_scoring?
    scored_at.nil? || (updated_at.present? && updated_at > scored_at)
  end

  private

  def normalize_discogs_username
    self.discogs_username = discogs_username&.downcase
  end
end
