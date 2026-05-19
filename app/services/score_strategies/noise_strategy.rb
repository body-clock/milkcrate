require "digest"
require "digest/md5"

# Adds deterministic daily variation to break ties between closely scored
# listings. Without noise, any two listings with the same raw score would
# appear in the same relative order every day — crate sections would become
# stale even with freshness rotation, because tied listings would ripple
# together through the ranking.
#
# The noise is derived from MD5(listing.id + date), producing a value in
# [-1.5, 1.5] that is:
#   - Deterministic: same listing on same date always gets the same noise,
#     so ranking is stable within a day
#   - Varies by day: the same listing gets different noise tomorrow,
#     so tie-breaking shifts over time
#   - Varies by listing: different listings on the same day get different
#     noise, so ties break differently across listings
#
# The magnitude (1.5) is calibrated to be smaller than any other scoring
# dimension's minimum non-zero contribution — it nudges rather than overrides.
# Two listings that differ meaningfully in desirability, condition, or
# freshness will still be ordered correctly; it only affects the ordering of
# listings that are genuinely close in quality.
class ScoreStrategies::NoiseStrategy
  NOISE_MAGNITUDE = 1.5

  def initialize(today: Date.today)
    @today = today
  end

  def score(listing)
    seed_str = "#{listing.id}-#{@today}"
    noise_unit = Digest::MD5.hexdigest(seed_str).to_i(16).to_f / (2**128)
    (noise_unit * 2 - 1) * NOISE_MAGNITUDE
  end
end
