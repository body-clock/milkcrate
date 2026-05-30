# Gives a mild freshness nudge to never-surfaced records (-0.5) and a mild
# penalty to records that have been surfaced (-0.5). The swing is intentionally
# small (1.0 total) so freshness is a gentle tiebreaker, not a dominant signal.
# Over time, as more records get surfaced, the score landscape adapts naturally.
class ScoreStrategies::FreshnessStrategy
  NEVER_SURFACED_BONUS = 0.5
  SURFACED_PENALTY = -0.5

  def score(listing)
    listing.last_surfaced_at.nil? ? NEVER_SURFACED_BONUS : SURFACED_PENALTY
  end
end
