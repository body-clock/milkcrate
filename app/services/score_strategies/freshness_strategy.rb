# Controls how often a record appears in crates by modulating its score based
# on how recently it was surfaced. Without this, the same top-scoring records
# would appear in every crate selection day after day, making the storefront
# feel static.
#
# The staleness curve applies penalties at three recency thresholds:
#   Never surfaced:  +3.0 — highest freshness bonus, ensures new-inventory
#                    records get first look
#   < 3 days ago:    -5.0 — strong penalty, recently seen records sit out
#   < 7 days ago:    -3.0 — moderate penalty
#   < 14 days ago:   -1.0 — mild penalty
#   >= 14 days ago:  +1.0 — recovered from staleness, eligible again
#
# The asymmetry is deliberate: the penalty for recent surfacing (-5) is much
# larger than the bonus for long-unseen (+1). This ensures the crate rotation
# has real turnover — a record that appeared yesterday won't compete with fresh
# inventory unless it's dramatically more desirable in other dimensions.
class ScoreStrategies::FreshnessStrategy
  STALENESS_CURVE = [
    [ 3,  -5 ],
    [ 7,  -3 ],
    [ 14, -1 ]
  ].freeze

  def initialize(today: Date.today)
    @today = today
  end

  def score(listing)
    return 3.0 if listing.last_surfaced_at.nil?

    days_ago = (@today - listing.last_surfaced_at.to_date).to_i

    STALENESS_CURVE.each do |threshold, penalty|
      return penalty.to_f if days_ago <= threshold
    end

    1.0
  end
end
