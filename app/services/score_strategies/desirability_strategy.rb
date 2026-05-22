# Captures market demand via the Discogs want/have ratio. This is the most
# objective signal in the scoring system — it reflects actual collector behavior
# across the entire Discogs marketplace, not just this store's inventory.
#
# Three components stack:
#   1. Log-base score: Math.log10(want + have) rewards records with deeper
#      market engagement. A record with 500 wants and 500 haves scores higher
#      than one with 1 of each at the same ratio — the market has spoken more
#      definitively about the first.
#   2. High-ratio bonus (+3): when wants significantly outstrip haves
#      (ratio >= 2.0 with at least 10 haves), the record is genuinely scarce.
#      Reduced from +5 during experiment calibration.
#   3. Low-ratio penalty (-2): when haves comfortably exceed wants
#      (ratio <= 0.5 with at least 10 haves), the record is common and
#      unlikely to excite a buyer.
#
# The MIN_HAVE floor (10) prevents thin data from driving decisions —
# a record with 2 wants and 1 have isn't desirable, it's just unknown.
class ScoreStrategies::DesirabilityStrategy
  HIGH_BONUS = 1.0
  LOW_PENALTY = -1.0

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
