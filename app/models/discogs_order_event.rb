# Persists operational facts about a Discogs marketplace order for audit
# and idempotent sales processing. No buyer PII is stored.
class DiscogsOrderEvent < ApplicationRecord
  belongs_to :store

  validates :discogs_order_id, presence: true, uniqueness: { scope: :store_id }
  validates :processed_at, presence: true
end
