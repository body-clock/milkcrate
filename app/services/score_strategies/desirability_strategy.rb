class ScoreStrategies::DesirabilityStrategy
  HIGH_BONUS = 5.0
  LOW_PENALTY = -2.0

  def score(listing)
    whr = WantHaveRatio.new(listing.want_count, listing.have_count)
    points = whr.log_base_score

    if whr.high?
      points += HIGH_BONUS
    elsif whr.low?
      points += LOW_PENALTY
    end

    points
  end

  def desirable?(listing)
    WantHaveRatio.new(listing.want_count, listing.have_count).high?
  end
end
