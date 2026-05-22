---
title: "Strategy-based crate selection with uniform scoring"
date: 2026-05-07
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Adding or refactoring storefront curation logic"
  - "Multiple selection algorithms share a scoring engine"
  - "Selection policies have duplicated size constants"
tags:
  - crate-strategies
  - curation
  - scoring
  - record-scorer
  - strategy-pattern
---

# Strategy-based crate selection with uniform scoring

## Context

The storefront curation flow had three selection mechanisms (`PicksSelector`,
`NewArrivalsPolicy`, `StorefrontThemeRotation`) each using different sort keys
and duplicated size constants (`FEATURED_CRATE_SIZE = 4`, `GENRE_CRATE_SIZE = 50`,
`NewArrivalsPolicy::CRATE_SIZE = 4`, `StorefrontTheme::FEATURED_CRATE_SIZE = 4`).
Feature additions (e.g., putting featured crates in the crate view tab bar)
required threading the same data through two separate arrays (`crates` vs
`storefront_sections`), and the frontend had to merge them.

The `RecordScorer` existed but only `PicksSelector` used it; new arrivals sorted
by recency timestamps and thematic crates sorted by want/have counts.

## Guidance

### 1. Strategy objects with a common interface

Each selection strategy implements `select(pool, excluded_ids:) -> [Listing]`.
Strategies are pure: they filter their domain, score via `RecordScorer`, and
return sorted results — uncapped. The caller applies `CuratedCrate::CRATE_SIZE`
and wraps results.

```ruby
# app/services/crate_strategies.rb
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

  class Thematic
    def initialize(store_id:, genre_counts:, today: Date.today)
      @scorer = RecordScorer.new(genre_counts:, today:)
    end

    def select(pool, excluded_ids:)
      # Pick random style/genre, filter to matches, score, return sorted
    end
  end
end
```

### 2. Single CRATE_SIZE constant on the container

`CuratedCrate::CRATE_SIZE = 50` is the single source of truth. No strategy
or policy holds its own size constant. The caller applies the cap:

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

### 3. Score once, filter per category

`build_genre_crates` scores all eligible listings once before the genre loop,
then filters the pre-sorted pool per genre. This avoids O(G × L) scoring calls:

```ruby
def build_genre_crates(excluded_ids:)
  scorer = RecordScorer.new(genre_counts:, today: Date.today)

  # Score all eligible listings once, sorted best-first
  scored = eligible_listings
    .reject { |l| excluded_ids.include?(l.id) }
    .map    { |l| [l, scorer.score(l)] }
    .sort_by { |_, s| -s }

  genre_counts.sort_by { |_, count| -count }.filter_map do |genre, _|
    listings = scored
      .select { |l, _| l.primary_genre == genre && !seen_ids.include?(l.id) }
      .first(CuratedCrate::CRATE_SIZE)
      .map(&:first)
    next if listings.empty?
    # ...
  end
end
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
  scoring dimension (e.g., cover quality) automatically applies to picks,
  new arrivals, thematic, and genre crates.
- **Testable in isolation.** Each strategy can be tested with a controlled
  pool and scorer mock, independent of `StorefrontCuration`.
- **Obvious extension point.** Adding a new crate type means adding a
  strategy class with the `select` interface — no changes to the curation
  orchestrator.

## When to Apply

- Adding a new automated crate to the storefront (e.g., "Staff Picks,"
  "Under $10")
- Changing how scoring works across all crate types
- Refactoring selection logic that has diverged into separate classes
  with duplicated constants

## Examples

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

## Related

- Issue [#124](https://github.com/body-clock/milkcrate/pull/124) — implementation PR
- Issue [#76](https://github.com/body-clock/milkcrate/issues/76) — upstream architecture PRD
- `app/services/crate_strategies.rb` — strategy module
- `app/models/curated_crate.rb` — container with `CRATE_SIZE`
- `app/models/record_scorer.rb` — shared scoring engine
- [Experiment pipeline simplification and scoring recalibration](../workflow-issues/experiment-pipeline-simplification-2026-05-21.md) — human-in-the-loop validation and strategy calibration
