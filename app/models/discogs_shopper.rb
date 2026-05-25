# A shopper authenticated with Discogs via OAuth 1.0a.
# Stores their OAuth access tokens for creating Discogs lists from pile items.
class DiscogsShopper < ApplicationRecord
  encrypts :oauth_token, :oauth_token_secret

  validates :discogs_username, presence: true, uniqueness: true

  scope :with_discogs_username, ->(username) { where(discogs_username: username.downcase) }

  before_validation { self.discogs_username = discogs_username&.downcase }

  def authenticated?
    oauth_token.present? && oauth_token_secret.present?
  end

  def touch_last_used!
    update!(last_used_at: Time.current)
  end
end
