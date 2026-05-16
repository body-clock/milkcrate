class LeadScorer
  # Scoring weights per dimension. Presence penalty is negative to deduct
  # from the composite when a standalone ecommerce storefront is found.
  WEIGHTS = {
    inventory_size: 3.0,
    vinyl_share: 3.0,
    genre_depth: 2.0,
    presence_penalty: -4.0
  }.freeze

  # Bounds for inventory size scoring.
  INVENTORY_IDEAL_MIN = 500
  INVENTORY_IDEAL_MAX = 5_000
  INVENTORY_ABS_MIN   = 100

  # When vinyl share reaches or exceeds this, the dimension scores 100.
  VINYL_PERFECT = 0.90
  VINYL_TARGET  = 0.70

  # ── Public API ──────────────────────────────────────────────────────────

  # Returns a hash with +:score+ (composite 0-100) and +:dimensions+ (per-dimension 0-100).
  def score(lead)
    dimensions = {
      inventory_size: score_inventory(lead.inventory_size),
      vinyl_share: score_vinyl(lead.vinyl_percentage),
      genre_depth: score_genres(lead.genres),
      presence_penalty: score_presence(lead.web_presence)
    }

    positive_weight_sum = WEIGHTS.values.select(&:positive?).sum
    pos_score = dimensions.slice(:inventory_size, :vinyl_share, :genre_depth)
                          .sum { |dim, val| val * WEIGHTS[dim] }
    penalty = dimensions[:presence_penalty] * WEIGHTS[:presence_penalty]
    total = pos_score + penalty

    max_possible = 100.0 * positive_weight_sum
    normalized = (total / max_possible) * 100.0
    normalized = [[normalized, 0.0].max, 100.0].min

    { score: normalized.round(2), dimensions: dimensions }
  end

  private

  # ── Dimension Scorers ──────────────────────────────────────────────────

  # Scores inventory count on a 0-100 scale:
  #   < 100        →  0 (too small to be worth it)
  #   100 - 499    → 40 (low-confidence tier)
  #   500 - 5_000  → 100 (sweet spot)
  #   > 5_000      →  0 (too large, likely already has a store)
  def score_inventory(count)
    return 0 if count.nil? || count < INVENTORY_ABS_MIN || count > INVENTORY_IDEAL_MAX
    return 40 if count < INVENTORY_IDEAL_MIN
    return 100 if count <= INVENTORY_IDEAL_MAX
    0
  end

  # Scores vinyl percentage on a 0-100 scale.
  # Accepts values like 92.00 (92%) or 0.92. Normalizes internally.
  def score_vinyl(pct)
    return 0 if pct.nil?
    value = pct.to_f
    value = value / 100.0 if value > 1.0  # convert percentage to decimal

    return 100 if value >= VINYL_PERFECT
    return 80  if value >= 0.80
    return 60  if value >= VINYL_TARGET
    return 30  if value >= 0.50
    0
  end

  # Scores genre depth on a 0-100 scale.
  def score_genres(genres)
    return 0 if genres.blank?
    count = genres.size
    return 100 if count >= 5
    return 80  if count >= 3
    return 50  if count >= 1
    0
  end

  # Scores web presence: applying a penalty dimension.
  # Returns 0 if no presence or unchecked, 100 if standalone ecommerce found.
  def score_presence(web_presence)
    return 0 if web_presence.blank?
    return 100 if web_presence["classified_as"] == "standalone_ecommerce"
    0
  end
end
