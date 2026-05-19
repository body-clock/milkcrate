class Release < ApplicationRecord
  validates :discogs_release_id, presence: true, uniqueness: true

  def want_have_ratio
    WantHaveRatio.new(want_count, have_count).ratio
  end

  def stale?
    enriched_at.nil? || enriched_at < 7.days.ago
  end
end
