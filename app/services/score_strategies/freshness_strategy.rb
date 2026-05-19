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
