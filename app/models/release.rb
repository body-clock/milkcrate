class Release < ApplicationRecord
  validates :discogs_release_id, presence: true, uniqueness: true

  def want_have_ratio
    return 0.0 if have_count.nil? || have_count == 0
    (want_count || 0).to_f / have_count
  end

  def stale?
    enriched_at.nil? || enriched_at < 7.days.ago
  end
end
