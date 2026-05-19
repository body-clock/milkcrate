class ScoreStrategies::ConditionStrategy
  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze
  CONDITION_ALIASES = {
    "near mint" => "NM",
    "m-" => "M",
    "mint-" => "M"
  }.freeze

  def score(listing)
    good_condition?(listing) ? 1.0 : 0.0
  end

  def good_condition?(listing)
    GOOD_CONDITIONS.include?(listing.condition&.strip) ||
      CONDITION_ALIASES.include?(listing.condition&.strip&.downcase)
  end
end
