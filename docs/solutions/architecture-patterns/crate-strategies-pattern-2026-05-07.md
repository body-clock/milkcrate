---
title: "Strategy-based crate selection with uniform scoring"
date: 2026-05-07
last_updated: 2026-06-07
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Adding or refactoring storefront curation logic"
  - "Multiple selection algorithms share a scoring engine"
  - "Selection policies have duplicated size constants"
  - "Score breakdown panel doesn't match crate order"
  - "A strategy implements its own ranking that conflicts with RecordScorer"
tags:
  - crate-strategies
  - curation
  - scoring
  - record-scorer
  - strategy-pattern
  - hidden-gems
  - genre-strategy
  - price-strategy
  - uniform-scoring
---

# Strategy-based crate selection with uniform scoring

## Context

The storefront curation flow originally had three selection mechanisms
(`PicksSelector`, `NewArrivalsPolicy`, `StorefrontThemeRotation`) each using
different sort keys and duplicated size constants. The `RecordScorer` existed
but only `PicksSelector` used it; new arrivals sorted by recency timestamps
and thematic crates sorted by want/have counts.

Over time, two issues surfaced:
- **HiddenGems** ranked by its own want/have ratio, so the score breakdown
  panel (which shows `RecordScorer` scores) displayed a different value than
  the actual crate ordering — confusing users and developers alike.
- **Genre crates** were built inline in `StorefrontCuration` without a
  dedicated strategy class, making the architecture inconsistent.

The correction: **strategies SELECT candidates; RecordScorer RANKS them.**
The strategy lives *on top of* the score, not alongside it. No strategy
re-implements its own sort order.

## Guidance

### 1. Strategies select; RecordScorer ranks

Each strategy implements `select(pool, excluded_ids:) -> [Listing]`.
Strategies filter their domain, score via `RecordScorer`, and return results
sorted by descending score — uncapped. The caller applies
`CuratedCrate::CRATE_SIZE` and wraps results.

Every strategy follows the same scoring pattern:

```ruby
candidates
  .map    { |l| [l, @scorer.score(l)] }
  .sort_by { |_, s| -s }
  .map(&:first)
```

The only thing that varies between strategies is the selection filter. The
ranking is always `-@scorer.score`. This means:

- **Score breakdown always matches crate ordering.** The frontend panel
  shows `RecordScorer#score_breakdown`, and crates sort by that same total.
- **Scorer-level decisions cascade.** Adding `PriceStrategy` (+1 for records
  ≥ $5) to `RecordScorer.default_strategies` applies to every crate type
  automatically.

### 2. Strategy classes

Each strategy lives in its own file under `app/services/crate_strategies/`:

| Strategy | File | Selection criteria | Since |
|----------|------|-------------------|-------|
| `Picks` | `picks.rb` | Top scored, genre-diverse, day-seed shuffled | Original |
| `NewArrivals` | `new_arrivals.rb` | Best-fit recency window (7/14/30/90/365d), then scored | Original |
| `Thematic` | `thematic.rb` | Random style/genre theme from pool, then scored | Original |
| `HiddenGems` | `hidden_gems.rb` | Low engagement (total ≤ 100), wants > haves (≥ 10), has image, genre cap 3 | Added later; ranking fixed to use RecordScorer |
| `Genre` | `genre.rb` | Single genre filter (`primary_genre`), scored, capped. Accepts a `curation_axis:` parameter (GenresAxis/StylesAxis) for field-level filtering — axis owns the matching logic, strategy owns the selection pipeline. | Extracted from StorefrontCuration |

```ruby
# app/services/crate_strategies/picks.rb
module CrateStrategies
  class Picks
    def initialize(genre_counts:, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
      @policy = PickPolicy.new
    end

    def select(pool, excluded_ids:, count: 12)
      # Score all, apply genre diversity, return top N
    end
  end
end
```

```ruby
# app/services/crate_strategies/new_arrivals.rb
module CrateStrategies
  class NewArrivals
    WINDOWS = [7, 14, 30, 90, 365].freeze
    MIN_RECORDS = 4

    def initialize(genre_counts:, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
    end

    def select(pool, excluded_ids:)
      # Find best recency window, score matches, return sorted
    end
  end
end
```

```ruby
# app/services/crate_strategies/thematic.rb
module CrateStrategies
  class Thematic
    MIN_RECORDS = 4

    def initialize(store_id:, genre_counts:, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
    end

    def select(pool, excluded_ids:)
      # Pick random style/genre, filter to matches, score, return sorted
    end
  end
end
```

```ruby
# app/services/crate_strategies/hidden_gems.rb
module CrateStrategies
  class HiddenGems
    MIN_RECORDS     = 4
    PER_GENRE_CAP   = 3
    MAX_ENGAGEMENT  = 100
    MIN_WANTS       = 10

    def initialize(genre_counts:, today: Date.today)
      @scorer       = RecordScorer.new(genre_counts:, today:)
      @genre_counts = genre_counts
    end

    def select(pool, excluded_ids:)
      # Select: low engagement, wants > haves, has image
      # Rank: pure RecordScorer score (no custom ranking)
    end
  end
end
```

```ruby
# app/services/crate_strategies/genre.rb
module CrateStrategies
  class Genre
    MIN_RECORDS = 4

    def initialize(genre:, genre_counts:, curation_axis: GenresAxis.new, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
      @genre  = genre
      @curation_axis = curation_axis
    end

    def select(pool, excluded_ids:)
      # Select: filter by axis (primary_genre or styles.include?)
      # Rank: pure RecordScorer score
      # Capped: CuratedCrate::CRATE_SIZE
    end
  end
end
```

### 3. Single CRATE_SIZE constant on the container

`CuratedCrate::CRATE_SIZE = 50` is the single source of truth. No strategy
holds its own size constant. The caller applies the cap:

```ruby
# app/models/curated_crate.rb
class CuratedCrate
  CRATE_SIZE = 50
  attr_reader :slug, :name, :listings
end

# app/services/storefront_curation.rb
na_listings = new_arrivals_strategy.select(eligible_listings, excluded_ids:)
  .first(CuratedCrate::CRATE_SIZE)
```

### 4. Featured crates in both homepage and crate view

The `crates` method (used by the crate view tab bar) now includes featured
crates between picks and genre crates, using the same top-down dedup ordering
as `storefront_sections`:

```ruby
def crates
  picks_list    = picks_strategy.select(...)
  featured      = build_featured_crates(excluded_ids: picks_ids)
  all_excluded  = picks_ids | featured_ids

  [
    CuratedCrate.new(slug: "picks", ...),
    *featured,
    *build_genre_crates(excluded_ids: all_excluded)
  ]
end
```

The frontend `allCrates` memo prefers `crates` (now complete) over
`storefront_sections`, so clicking a featured crate from the homepage opens
the correct 50-record version.

## Why This Matters

- **No duplicated constants.** When tuning the crate size (e.g., 50 → 40),
  one constant change propagates everywhere.
- **Uniform scoring.** All crates score via `RecordScorer`. Adding a new
  scoring dimension (e.g., PriceStrategy with +1 for records ≥ $5)
  automatically applies to picks, new arrivals, thematic, hidden gems, and
  genre crates — no per-strategy registration.
- **Score breakdown is truthful.** The `<ScoreBreakdown>` component shows
  `RecordScorer#score_breakdown`, and every crate sorts by that same total.
  No more "this record ranked #2 but scored 0" confusion.
- **Testable in isolation.** Each strategy can be tested with a controlled
  pool and scorer mock, independent of `StorefrontCuration`.
- **Obvious extension point.** Adding a new crate type means adding a
  strategy class with the `select` interface — no changes to the curation
  orchestrator.

## When to Apply

- Adding a new automated crate to the storefront (e.g., "Staff Picks",
  "Under $10")
- Changing how scoring works across all crate types — put it in RecordScorer
- Refactoring selection logic that has diverged into separate classes
  with duplicated constants
- Debugging a crate where the score breakdown doesn't match the ordering —
  check if the strategy has its own custom ranking
- A strategy has axis-dependent field selection (e.g., `primary_genre` vs
  `styles`) — extract a polymorphic axis object rather than threading a
  symbol and branching in every strategy

## Examples

**Before** — Strategy ranking by its own metric, score breakdown lies:

```ruby
# OLD: HiddenGems ranked by want/have ratio
def select(pool, excluded_ids:)
  obscure = candidates.select { |l| /* low engagement filter */ }
  # Custom ranking that doesn't match score breakdown!
  ranked = obscure.sort_by { |l| -WantHaveRatio.new(...).want }
  # User sees "score: 1.5" in breakdown but record is ranked #1
end
```

**After** — Strategy selects, RecordScorer ranks:

```ruby
# NEW: Pure RecordScorer ranking
def select(pool, excluded_ids:)
  obscure = candidates.select { |l| /* low engagement filter */ }
  # Score breakdown and crate order now match exactly
  scored = obscure
    .map    { |l| [l, @scorer.score(l)] }
    .sort_by { |_, s| -s }
    .map(&:first)
end
```

**Before** — `NewArrivalsPolicy` with bespoke sort key, duplicated constant:
```ruby
class NewArrivalsPolicy
  CRATE_SIZE = 4
  def select(pool, sort_key:)
    # sorts by sort_key (a lambda from the caller)
  end
end
```

**After** — `CrateStrategies::NewArrivals` using `RecordScorer`:
```ruby
class CrateStrategies::NewArrivals
  def select(pool, excluded_ids:)
    # scores via RecordScorer, same as every other strategy
  end
end
```

**Before** — Genre crates inline in orchestrator, no strategy class:
```ruby
# OLD: StorefrontCuration#build_genre_crates
# All the scoring, filtering, and exclusion logic inline
```

**After** — `CrateStrategies::Genre` extracted:
```ruby
# NEW: Strategy class with standard interface
CrateStrategies::Genre.new(genre:, genre_counts:, today:)
# One instance per genre, uniform interface
```

## Related

- Issue [#124](https://github.com/body-clock/milkcrate/pull/124) — original crate strategy PR
- Issue [#187](https://github.com/body-clock/milkcrate/pull/187) — price strategy + HiddenGems fix + Genre extraction
- `app/services/crate_strategies/` — all strategy classes
- `app/services/crate_strategies/hidden_gems.rb` — HiddenGems with score-based ranking
- `app/services/crate_strategies/genre.rb` — extracted Genre strategy
- `app/models/curated_crate.rb` — container with `CRATE_SIZE`
- `app/models/record_scorer.rb` — shared scoring engine
- `app/services/score_strategies/price_strategy.rb` — scorer-level price boost
- `app/frontend/components/score_breakdown.tsx` — dev debug panel showing per-strategy scores
- [Experiment pipeline simplification and scoring recalibration](../workflow-issues/experiment-pipeline-simplification-2026-05-21.md) — human-in-the-loop validation and strategy calibration
- [Replace type-code conditionals with polymorphic curation axis](replace-type-code-with-polymorphism-2026-06-07.md) — CurationAxis base class + GenresAxis/StylesAxis subclasses; the axis IS the behavior difference, strategies just call `axis.key_for` or `axis.matches?`
