# The owner of a store with OAuth credentials and contact info.
class StoreOwner < ApplicationRecord
  has_many :stores, dependent: :nullify

  encrypts :discogs_oauth_token, :discogs_oauth_token_secret, support_unencrypted_data: true

  validates :discogs_username, presence: true, uniqueness: true

  scope :with_discogs_username, ->(username) { where(discogs_username: username.downcase) }

  def oauth_authorized?
    discogs_oauth_token.present? && discogs_oauth_token_secret.present? && oauth_authorized_at.present?
  end
end
