# Computes a composite score for a listing across all score strategies.
class RecordScorer
  def initialize(strategies: nil, genre_counts:, today: Date.today)
    @strategies = strategies || self.class.default_strategies(genre_counts:, today:)
  end

  def score(listing)
    score_breakdown(listing).values.sum
  end

  def score_breakdown(listing)
    @strategies.transform_values { |s| s.score(listing) }
  end

  def good_condition?(listing)
    condition_strategy.score(listing).positive?
  end

  def desirable?(listing)
    desirability_strategy.desirable?(listing)
  end

  def self.default_strategies(genre_counts:, today: Date.today)
    {
      vintage: ScoreStrategies::VintageStrategy.new,
      condition: ScoreStrategies::ConditionStrategy.new,
      desirability: ScoreStrategies::DesirabilityStrategy.new,
      metadata: ScoreStrategies::MetadataStrategy.new,
      cover_quality: ScoreStrategies::CoverQualityStrategy.new,
      freshness: ScoreStrategies::FreshnessStrategy.new,
      noise: ScoreStrategies::NoiseStrategy.new(today:),
      price: ScoreStrategies::PriceStrategy.new
    }.freeze
  end

  private

  def condition_strategy
    @strategies[:condition]
  end

  def desirability_strategy
    @strategies[:desirability]
  end
end
