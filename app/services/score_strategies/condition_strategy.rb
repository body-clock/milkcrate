# Rewards listings in collectible condition (Mint through VG+). Condition is
# the single strongest price driver on Discogs — a NM copy of a common record
# can sell for 10x what a Generic copy fetches. The aliases handle real-world
# condition strings that Discogs sellers use inconsistently ("Near Mint",
# "m-", "mint-") so a seller who types casually still gets credit.
# Only positive scoring: poor condition listings get 0 rather than a penalty,
# since condition is a quality signal, not a demerit.
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
