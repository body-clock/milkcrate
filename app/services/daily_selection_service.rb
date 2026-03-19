class DailySelectionService
  # ─── Levers ───────────────────────────────────────────────────────────────
  #
  # Adjust these to change how the daily selection feels.

  # Total records surfaced per store per day
  SELECTION_SIZE = 500

  # Fraction of yesterday's selection carried over (continuity between days)
  OVERLAP_FRACTION = 0.30

  # How much to favor recently listed records.
  # Higher = new arrivals dominate; lower = older stock gets more exposure.
  RECENCY_WEIGHT = 3

  # How much to favor records in good condition (NM, VG+).
  QUALITY_WEIGHT = 2

  # How much to favor records with discovery styles (world, experimental, etc.)
  # This stacks with the PicksSelector — interesting records appear in both
  # the daily rotation AND rise to the top of Milkcrate Picks.
  DISCOVERY_WEIGHT = 3

  # How much to boost records that haven't appeared in a recent selection.
  # Ensures long-tail catalog gets surfaced over time.
  UNSEEN_BOOST = 4

  # ── Discovery styles (shared with PicksSelector) ──────────────────────────
  DISCOVERY_STYLES = PicksSelector::DISCOVERY_STYLES

  # ─────────────────────────────────────────────────────────────────────────

  def initialize(store)
    @store = store
  end

  def generate(date: Date.current)
    carry_over_ids = compute_carry_over(date)
    fresh_ids      = compute_fresh(date, exclude_ids: carry_over_ids)
    all_ids        = (carry_over_ids + fresh_ids).first(SELECTION_SIZE)

    DailySelection.find_or_initialize_by(store: @store, selected_on: date)
      .tap { |ds| ds.update!(listing_ids: all_ids) }
  end

  private

  def compute_carry_over(date)
    yesterday = DailySelection.on(@store, date - 1)
    return [] unless yesterday&.listing_ids&.any?

    carry_count = (SELECTION_SIZE * OVERLAP_FRACTION).to_i
    scored = score_listings(@store.listings.where(id: yesterday.listing_ids))
    scored.max_by(carry_count) { |_, s| s }.map { |l, _| l.id }
  end

  def compute_fresh(date, exclude_ids:)
    fresh_count = SELECTION_SIZE - exclude_ids.size
    candidates = score_listings(@store.listings.where.not(id: exclude_ids))

    # Efraimidis-Spirakis weighted reservoir sampling:
    # Each listing gets rand^(1/weight) — higher weight = higher probability.
    # Produces a proper weighted random sample in one pass.
    candidates
      .map { |listing, weight| [ listing, rand**( 1.0 / [ weight, 0.1 ].max) ] }
      .max_by(fresh_count) { |_, v| v }
      .map { |l, _| l.id }
  end

  def score_listings(scope)
    recent_ids = recent_selection_ids

    scope.map do |listing|
      weight = 1 # base weight — every record has a chance

      # Recency: how recently was it listed in the store
      if listing.listed_at
        days_ago = (Date.current - listing.listed_at.to_date).to_i
        weight += RECENCY_WEIGHT if days_ago < 30
        weight += (RECENCY_WEIGHT - 1) if days_ago.between?(30, 90)
      end

      # Condition quality
      weight += QUALITY_WEIGHT if %w[Mint NM M VG+].include?(listing.condition&.strip)

      # Discovery styles
      matching = listing.styles & DISCOVERY_STYLES
      weight += matching.size * DISCOVERY_WEIGHT

      # Unseen boost — hasn't appeared in recent selections
      weight += UNSEEN_BOOST unless recent_ids.include?(listing.id)

      [ listing, weight ]
    end
  end

  def recent_selection_ids
    @recent_selection_ids ||= DailySelection
      .where(store: @store)
      .where(selected_on: (Date.current - 7)..Date.current)
      .flat_map(&:listing_ids)
      .to_set
  end
end
