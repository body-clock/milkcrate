# Context: Uniform Scoring Architecture and ScoreStrategies Extraction

## Summary

This analysis documents the architectural principle that **all crate strategies rank by `RecordScorer` score — the strategy selects candidates, the scorer determines ordering**. This was not always the case (HiddenGems had a custom sort, Genre lacked a strategy class at all), and the consistent pattern was established through incremental refactors and additions.

---

## Architecture Pattern

### Core Principle: Strategy selects, Scorer ranks

Every `CrateStrategies::*` class implements `select(pool, excluded_ids:) -> [Listing]`:

| Strategy | Selection criteria | Sort key | Since |
|----------|-------------------|----------|-------|
| `Picks` (line 1-28) | Genre-diverse, shuffled by day seed | `RecordScorer#score` | Original |
| `NewArrivals` (line 1-32) | Best-fit recency window (7/14/30/90/365d) | `RecordScorer#score` | Original |
| `Thematic` (line 1-57) | Random style/genre theme from pool | `RecordScorer#score` | Original |
| `HiddenGems` (line 1-44) | Low engagement, wants > haves, has image | **`RecordScorer#score` (refactored)** | Bug fix |
| `Genre` (line 1-24) | Single genre filter | `RecordScorer#score` | Extracted |

**Key insight:** The strategy sits *on top of* the score, not *alongside* it. Strategies may have completely different candidate-selection logic (recency windows, want/have ratios, genre diversity), but once candidates are identified, **every single strategy sorts by descending `RecordScorer#score`**.

### Why This Matters

1. **Score breakdown panel is truthful.** The frontend `<ScoreBreakdown>` component (`app/frontend/components/score_breakdown.tsx`) renders the `score_breakdown` hash from `RecordScorer`. If a crate used a different sort key (as HiddenGems did with want/have ratio), the displayed score would disagree with the actual ordering — a confusing user experience.

2. **Scorer-level decisions cascade.** Adding a strategy to `RecordScorer.default_strategies` (e.g., `PriceStrategy` with a $5 threshold, +1 boost) automatically flows into ALL crates. No per-strategy registration needed.

3. **New crate types are trivial.** Implement `select(pool, excluded_ids:)`, score with `@scorer.score(listing)`, sort descending. The caller caps with `CuratedCrate::CRATE_SIZE`.

---

## ScoreStrategies Module (Scoring Dimensions)

Extracted during the Sandi Metz POODR refactors (`refactor/model-sandi-metz-poodr` branch). Previously, RecordScorer had 8 private methods; now each dimension is a standalone class in `app/services/score_strategies/`:

### All Score Strategies

| Strategy | File | Behavior | Type |
|----------|------|----------|------|
| `VintageStrategy` | `vintage_strategy.rb` | +2.0 if year <= 1983 | boost |
| `ConditionStrategy` | `condition_strategy.rb` | +1.0 if condition matches good list | boost |
| `DesirabilityStrategy` | `desirability_strategy.rb` | Log-base score + high/low bonus/penalty using `WantHaveRatio` | graduated |
| `MetadataStrategy` | `metadata_strategy.rb` | -1.0 if no styles | penalty |
| `CoverQualityStrategy` | `cover_quality_strategy.rb` | +1.0 distinct cover, -0.5 missing, -1.0 cover==thumbnail | graduated |
| `FreshnessStrategy` | `freshness_strategy.rb` | Penalty for recently surfaced, bonus for long-unseen | graduated |
| `NoiseStrategy` | `noise_strategy.rb` | Daily deterministic variation (±random based on listing+date hash) | noise |
| `SectionStrategy` | `section_strategy.rb` | +1.0 if in a curated section | boost |
| **`PriceStrategy`** | `price_strategy.rb` | **+1.0 if price >= $5.00** | **boost (new)** |

### PriceStrategy Specifics

- **File:** `app/services/score_strategies/price_strategy.rb`
- **Threshold:** `PRICE_THRESHOLD = 5.00` (dollars, inclusive)
- **Boost:** `PRICE_BOOST = 1.0`
- **Behavior:** Returns 1.0 for records with `price >= 5.00`, 0.0 otherwise (nil-safe via `&&`)
- **Design rationale:** Pure commercial-value boost. Higher-priced records = higher AOV and tend to be more collectible/interesting. No penalty for cheap records — consistent with the system's bias toward positive-or-neutral scoring.
- **Registration:** Added as `price:` key in `RecordScorer.default_strategies` (line 20)
- **Frontend label:** "Price" (registered in `STRATEGY_LABELS` in `score_breakdown.tsx` line 11)
- **Note:** The original design plan proposed a $10 threshold; the implementation settled on $5. The `PRICE_THRESHOLD` constant is the canonical source of truth.

### Registration Pattern

```ruby
# app/models/record_scorer.rb, line 15-25
def self.default_strategies(genre_counts:, today: Date.today)
  {
    vintage: ScoreStrategies::VintageStrategy.new,
    condition: ScoreStrategies::ConditionStrategy.new,
    desirability: ScoreStrategies::DesirabilityStrategy.new,
    metadata: ScoreStrategies::MetadataStrategy.new,
    cover_quality: ScoreStrategies::CoverQualityStrategy.new,
    freshness: ScoreStrategies::FreshnessStrategy.new(today:),
    noise: ScoreStrategies::NoiseStrategy.new(today:),
    price: ScoreStrategies::PriceStrategy.new
  }.freeze
end
```

Each strategy must respond to `score(listing)` and return a Float (positive, negative, or zero). No base class — pure duck typing.

---

## Notable Fixes and Extractions

### HiddenGems Scoring Alignment

**File:** `app/services/crate_strategies/hidden_gems.rb`

**Before:** HiddenGems ranked candidates by custom `WantHaveRatio`-based sort, not by `RecordScorer` score. This meant the frontend score breakdown (which uses `listing.score_breakdown` from `RecordScorer`) showed a different score than the actual ordering — a data inconsistency.

**After:** HiddenGems still **selects** candidates using its own criteria (low engagement, wants > haves, has image), but then **ranks** by `RecordScorer#score` the same as every other strategy:

```ruby
# HiddenGems#select (lines 23-27)
scored = obscure
  .map { |listing| [ listing, @scorer.score(listing) ] }
  .sort_by { |_, s| -s }
  .map(&:first)
```

### CrateStrategies::Genre Extraction

**File:** `app/services/crate_strategies/genre.rb`

Previously, genre crates were built inline in `StorefrontCuration#build_genre_crates` without a dedicated strategy class. Extracted to follow the same interface as all other strategies. Uses `primary_genre == @genre` for filtering, scores via `RecordScorer`, caps at `CuratedCrate::CRATE_SIZE`.

---

## Data Flow

```
StorefrontCuration
  ├── eligible_listings (from store scope, filtered)
  ├── genre_counts (tally of primary_genre)
  │
  ├── CrateStrategies::Picks#select
  │     └── RecordScorer#score (for every candidate)
  │
  ├── CrateStrategies::NewArrivals#select
  │     └── RecordScorer#score
  │
  ├── CrateStrategies::Thematic#select
  │     └── RecordScorer#score
  │
  ├── CrateStrategies::HiddenGems#select
  │     └── RecordScorer#score
  │
  └── CrateStrategies::Genre#select (per genre)
        └── RecordScorer#score
```

All crates are wrapped in `CuratedCrate` containers and capped to `CuratedCrate::CRATE_SIZE (50)` by the caller, not the strategy.

---

## Key Files and Lines

| File | Lines | Purpose |
|------|-------|---------|
| `app/models/record_scorer.rb` | 1-42 | Composes all score strategies, delegates per-listing |
| `app/models/record_scorer.rb` | 15-25 | `default_strategies` — registration of all score strategies |
| `app/services/crate_strategies/picks.rb` | 1-28 | Picks strategy (genre-diverse, day-seed shuffle) |
| `app/services/crate_strategies/new_arrivals.rb` | 1-32 | New Arrivals strategy (recency windows) |
| `app/services/crate_strategies/thematic.rb` | 1-57 | Thematic strategy (random style/genre theme) |
| `app/services/crate_strategies/hidden_gems.rb` | 1-44 | Hidden Gems strategy (low engagement filter, scorer rank) |
| `app/services/crate_strategies/genre.rb` | 1-24 | Genre strategy (single-genre filter, copied extraction) |
| `app/services/score_strategies/price_strategy.rb` | 1-9 | PriceStrategy: +1 boost at $5 threshold |
| `app/frontend/components/score_breakdown.tsx` | 1-40 | Frontend breakdown panel showing each score dimension |
| `app/services/storefront_curation.rb` | 1-150+ | Orchestrator that wires strategies together |
| `app/values/want_have_ratio.rb` | 1-26 | Value object used by HiddenGems AND DesirabilityStrategy |

---

## Validation Path

- **Unit tests:** `spec/models/record_scorer_spec.rb` — covers score computation end-to-end
- **Unit tests:** `spec/services/score_strategies/price_strategy_spec.rb` — price strategy isolation
- **Integration:** `spec/services/storefront_curation_spec.rb` — curated crate generation
- **No direct specs exist** for `CrateStrategies::HiddenGems` or `CrateStrategies::Genre` — only tested through `StorefrontCuration` integration tests
- **Manual validation:** Verify score breakdown panel (`<ScoreBreakdown>`) matches ordering in any given crate

---

## Proposed Documentation

### Category

`docs/solutions/architecture-patterns/`

### Suggested Filename

`uniform-scoring-scorer-level-strategies-2026-05-22.md`

### Track

**Knowledge** — This documents an architectural principle (strategy selects, scorer ranks) and the extraction pattern (ScoreStrategies module). The HiddenGems fix was a logic bug, but the lasting value is the architectural invariant that prevents recurrence. A separate `logic-errors/` entry could be created if the HiddenGems bug needs its own documentation.

### YAML Frontmatter Skeleton

```yaml
---
title: "Uniform scoring: crate strategies select, RecordScorer ranks"
date: 2026-05-22
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Adding a new crate type to the storefront"
  - "Adding a new scoring dimension via ScoreStrategies"
  - "Debugging score breakdown mismatch with crate ordering"
  - "Understanding how scoring decisions cascade to all crates"
tags:
  - crate-strategies
  - scoring
  - record-scorer
  - score-strategies
  - uniform-scoring
  - strategy-pattern
  - hidden-gems
  - price-strategy
---
```

### Related Docs

- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — covers the crate strategy extraction and `CuratedCrate::CRATE_SIZE` convention
- `docs/solutions/workflow-issues/experiment-pipeline-simplification-2026-05-21.md` — covers human-in-the-loop validation and strategy calibration
- `docs/plans/2026-05-22-001-feat-price-strategy-plan.md` — PriceStrategy implementation plan
- `docs/plans/2026-05-19-002-refactor-models-sandi-metz-plan.md` — ScoreStrategies extraction plan (U2)
