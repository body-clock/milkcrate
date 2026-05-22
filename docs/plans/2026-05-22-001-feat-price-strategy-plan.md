---
title: feat: Add price-based record scoring strategy
type: feat
status: active
date: 2026-05-22
origin: docs/superpowers/specs/2026-05-22-price-strategy-design.md
---

# feat: Add price-based record scoring strategy

## Summary

Add a `PriceStrategy` to the record scoring system that boosts records priced $10+
by 1 point. Follows the established pattern of 8 existing strategy classes in
`app/services/score_strategies/` — one new file, one registration line in
`RecordScorer.default_strategies`, and one new test file.

---

## Context & Research

### Relevant Code and Patterns

- **Strategy pattern:** `app/services/score_strategies/vintage_strategy.rb` — closest analog (single boolean condition returning a flat boost or 0). Each strategy:
  - Inherits from no base class (pure duck typing)
  - Implements `#score(listing)` returning a float
- **Registration:** `app/models/record_scorer.rb` line 20 — strategies registered as a frozen hash in `default_strategies`
- **Test pattern:** `spec/services/score_strategies/vintage_strategy_spec.rb` — uses `build_listing` helper which proxies to `build_stubbed(:listing, overrides)`. Price is a `decimal` column on Listing; tests pass it as a numeric value.
- **Factory:** `spec/factories/listings.rb` — Listing factory has no default price (so nil by default)

### Institutional Learnings

- All existing strategies use flat numeric bonuses/penalties (1.0, -1.0, 2.0). No graduated scales in the scoring system. This plan's binary boost (+1 if >= $10, else 0) matches the convention.
- Strategies are penalty-averse: boosts are common, penalties are rare (MetadataStrategy at -1 is the only penalty-only strategy). PriceStrategy follows suit — no penalty for cheap records.

---

## Key Technical Decisions

- **Binary boost (not graduated):** +1 for price >= $10, 0 otherwise. No tiered scoring. Matches the user's explicit choice during brainstorming.
- **Inclusive threshold (>= $10):** $10.00 exactly qualifies for the boost.
- **No penalty for nil/cheap:** `nil` and < $10 both return 0.0. Consistent with the system's bias toward positive-or-neutral scoring.
- **New standalone class (not folded into DesirabilityStrategy):** Price is the seller's listing price, not market demand — different signal, different strategy.

---

## Implementation Units

### U1. Create `PriceStrategy` and register it

**Goal:** Add a working `ScoreStrategies::PriceStrategy` and wire it into the scorer.

**Requirements:** R1 — Records priced >= $10 get +1 scoring boost

**Dependencies:** None

**Files:**
- Create: `app/services/score_strategies/price_strategy.rb`
- Modify: `app/models/record_scorer.rb` (register in `default_strategies`)
- Test: `spec/services/score_strategies/price_strategy_spec.rb`

**Approach:**
- Create the strategy following `VintageStrategy`'s structure: class with a `PRICE_THRESHOLD` constant, `PRICE_BOOST` constant, and a `#score(listing)` method
- Register it as `price: ScoreStrategies::PriceStrategy.new` in `RecordScorer.default_strategies`, placing it after `noise` (alphabetical position, consistent with hash ordering)

**Patterns to follow:**
- `app/services/score_strategies/vintage_strategy.rb` — single-condition check returning a flat value or 0

**Test scenarios:**
- Happy path: record with price >= $10.00 (e.g., 10.00, 15.99, 250.00) returns +1.0
- Edge case: record with price exactly $10.00 returns +1.0 (inclusive threshold)
- Edge case: record with price < $10.00 (e.g., 9.99, 5.00) returns 0.0
- Edge case: record with price = 0.00 returns 0.0
- Edge case: record with price = nil returns 0.0

**Verification:**
- `bundle exec rspec spec/services/score_strategies/price_strategy_spec.rb` passes
- `bundle exec rspec` — full suite remains green (new strategy is registered and returns 0.0 for existing records with no price set)
- `RecordScorer.default_strategies` includes `:price` key

---

## System-Wide Impact

- **Interaction graph:** No existing behaviors depend on the price strategy. All existing score computations are additive and independent — adding a new strategy with a default 0.0 response leaves all existing scores unchanged for un-priced records.
- **Error propagation:** PriceStrategy has no failure modes (no external dependencies, no nil methods on listing.price since BigDecimal handles nil safely with `&&`).
- **Unchanged invariants:** All existing strategy scores are unchanged. The RecordScorer interface (`score(listing)`, `score_breakdown(listing)`) is unchanged. No API, view, or serialization changes needed.

---

## Risks & Dependencies

No meaningful risks. This is a small, isolated addition following an established pattern with 8 identical examples.

---

## Sources & References

- **Origin document:** [docs/superpowers/specs/2026-05-22-price-strategy-design.md](path)
- Existing strategy pattern: `app/services/score_strategies/vintage_strategy.rb`
- Registration pattern: `app/models/record_scorer.rb` (line 20, `default_strategies`)
- Test pattern: `spec/services/score_strategies/vintage_strategy_spec.rb`
