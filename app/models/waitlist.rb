class Waitlist < ApplicationRecord
  before_validation :normalize_discogs_username, if: :discogs_username_changed?

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :discogs_username, presence: true, uniqueness: true

  scope :with_discogs_username, ->(username) { where(discogs_username: username.downcase) }

  private

  def normalize_discogs_username
    self.discogs_username = discogs_username&.downcase
  end
end
