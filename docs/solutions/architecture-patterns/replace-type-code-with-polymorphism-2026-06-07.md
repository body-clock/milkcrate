---
module: storefront
date: 2026-06-07
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "type-code symbol is threaded through multiple constructors and checked with if/else branches"
  - "behavior varies based on a discrete discriminator with 2+ values"
  - "new variants are expected or existing branching is growing across multiple classes"
  - "each branch delegates to the same downstream methods but with different parameters"
tags:
  - polymorphism
  - refactoring
  - type-code
  - conditional-logic
  - strategy-pattern
  - curation-axis
related_components:
  - rails_model
---

# Replace type-code conditionals with polymorphic curation axis

## Context

The storefront curation system introduced a `:genres`/:styles`symbol to switch between top-level Discogs genres and sub-genre styles for narrow-catalog stores (see PR [#244](https://github.com/body-clock/milkcrate/pull/244)). The symbol was threaded through five constructors — `Wall`, `CrateStrategies::Wall`, `CrateStrategies::Genre`, `CrateStrategies::HiddenGems`, and `StorefrontCuration` — and every strategy branched on it with`if @curation_axis == :styles`/`else`. This is a classic "type code with conditionals" anti-pattern from Sandi Metz's _Practical Object-Oriented Design in Ruby_.

The product model makes this pattern especially costly. The storefront has three distinct surface types — Wall (a taste surface that conveys the store's point of view through a cover-first mural), Featured (rotating thematic crates), and Genre Grid (crate-digging surface). The Wall is not just another crate path; it's a fundamentally different interaction mode with a lightweight peek sheet rather than inline crate-digging. When the axis symbol conflates these surfaces by forcing each strategy to branch individually, changes that affect one surface risk silently breaking another.

The immediate trigger was recognizing that adding a third axis (e.g., artist-based curation) would require touching every strategy plus the decision point, multiplying the conditional surface area. The refactoring extracted a `CurationAxis` base class with `GenresAxis` and `StylesAxis` subclasses — the axis IS the behavior difference.

## Guidance

### 1. Identify the type code and its consumers

Find every place a symbol or enum is checked with `if`/`case`/`? :`. In the before state, `@curation_axis` appeared in three strategy methods (`apply_genre_cap`, `matches_axis?`, `under_genre_cap?`) and two `StorefrontCuration` methods (`curation_axis`, `genre_counts`).

### 2. Extract the polymorphic interface

Look at what each branch *does differently*. For the curation axis:

| Operation | `:genres` | `:styles` |
|-----------|-----------|-----------|
| `key_for(listing)` | `listing.primary_genre` | `listing.styles.first` |
| `matches?(listing, name)` | `listing.primary_genre == name` | `Array(listing.styles).include?(name)` |
| `tally_from(listings)` | `listings.map(&:primary_genre)` | `listings.flat_map(&:styles)` |

These become the abstract interface:

```ruby
# app/services/curation_axis.rb
class CurationAxis
  def key_for(_listing)    = raise NotImplementedError
  def matches?(_listing, _name) = raise NotImplementedError
  def tally_from(_listings) = raise NotImplementedError
end
```

### 3. Create one subclass per variant — zero conditionals

```ruby
# app/services/genres_axis.rb
class GenresAxis < CurationAxis
  def key_for(listing)    = listing.primary_genre
  def matches?(listing, name) = listing.primary_genre == name
  def tally_from(listings) = listings.map(&:primary_genre).compact.tally
end

# app/services/styles_axis.rb
class StylesAxis < CurationAxis
  def key_for(listing)    = listing.styles.first
  def matches?(listing, name) = Array(listing.styles).include?(name)
  def tally_from(listings) = listings.flat_map(&:styles).compact.tally
end
```

### 4. Replace type-code branches with polymorphic calls

Every `@curation_axis == :styles ? ... : ...` becomes `@curation_axis.key_for(...)`:

```ruby
# Before — type code with ternary
def apply_genre_cap(listing, genre_cap:, genre_seen:)
  genre = @curation_axis == :styles ? listing.styles.first : listing.primary_genre
  return if genre_seen[genre] >= genre_cap
  genre_seen[genre] += 1
  listing
end

# After — polymorphic method call
def apply_genre_cap(listing, genre_cap:, genre_seen:)
  genre = @curation_axis.key_for(listing)
  return if genre_seen[genre] >= genre_cap
  genre_seen[genre] += 1
  listing
end
```

If a private helper existed solely to branch on the type code, delete it entirely — the polymorphic call supersedes it. In this refactoring, `matches_axis?` in `CrateStrategies::Genre` was deleted and replaced inline by `@curation_axis.matches?(l, @genre)`.

### 5. Single decision point for instantiation

The only place that branches on the type is where the axis object is constructed:

```ruby
# app/services/storefront_curation.rb
def curation_axis
  @curation_axis ||= (deep_genre_count >= 3) ? GenresAxis.new : StylesAxis.new
end
```

This is the "factory" — the one place where conditionals belong. Every consumer downstream gets a fully-formed axis object and calls its methods without checking which subtype it is. `tally_from` also moves from a conditional block to a simple delegation:

```ruby
# Before
def genre_counts
  @genre_counts ||= if curation_axis == :styles
    eligible_listings.flat_map(&:styles).compact.tally
  else
    eligible_listings.map(&:primary_genre).compact.tally
  end
end

# After
def genre_counts
  @genre_counts ||= curation_axis.tally_from(eligible_listings)
end
```

### 6. Thread the axis object (not a symbol) through constructors

Strategy constructors accept the axis instance directly. The default is `GenresAxis.new` for backward compatibility in tests and experiment pipelines:

```ruby
class Wall
  def initialize(eligible_listings:, genre_counts:, curation_axis: GenresAxis.new)
    @curation_axis = curation_axis
  end
end

class CrateStrategies::Genre
  def initialize(genre:, genre_counts:, curation_axis: GenresAxis.new, today: Date.today)
    @curation_axis = curation_axis
  end
end
```

### 7. Adding a third axis

To add an artist-based axis: create `ArtistsAxis < CurationAxis` with the three interface methods, then add one branch in `StorefrontCuration#curation_axis`. Zero changes to strategy classes.

## Why This Matters

- **Eliminates duplicated branching.** Before: every strategy that touched the axis had its own `if/else`. After: zero branches in strategy code. The refactoring removed 3 net lines despite adding two new files and 10 new specs — the strategies got simpler.

- **Single decision point.** Which axis to use lives in exactly one place. Changing the heuristic (threshold, depth ratio) requires one edit.

- **Extensible without cascading changes.** New axis variants are one new subclass + one factory branch. This matters especially because the styling axis is already being studied for deeper filtering (#245) — any future refactoring of the axis behavior is isolated.

- **Testable in isolation.** You can pass `GenresAxis.new` or `StylesAxis.new` directly into strategy tests. No need to mock symbols or simulate branching logic.

- **Self-documenting.** `GenresAxis#key_for` tells you "this axis groups by primary genre" without reading ternary expressions. The class name IS the documentation.

- **Sandi Metz principle in practice.** "Replace conditional with polymorphism" is one of the highest-leverage OO refactorings. It eliminates not just code but the cognitive load of tracking which branches apply where — especially important here because the three surfaces (Wall, Featured, Genre Grid) have different interaction models that the axis must serve without conflating them.

## When to Apply

- A symbol or enum is passed through 3+ classes, and each class branches on it
- The variant behaviors are stable — the differences between `:genres` and `:styles` are well-understood
- You anticipate adding a new variant soon
- The operations that vary by type are finite and nameable

Do **not** apply when there's only one consumer — a single ternary is cheaper than a class hierarchy. Do **not** apply when variants change frequently in incompatible directions.

## Examples

The full before/after covers three strategy classes and the orchestrator:

```ruby
# BEFORE — Wall: ternary in apply_genre_cap
genre = @curation_axis == :styles ? listing.styles.first : listing.primary_genre

# BEFORE — Genre: private helper matches_axis? with if/else
def matches_axis?(listing)
  if @curation_axis == :styles
    Array(listing.styles).include?(@genre)
  else
    listing.primary_genre == @genre
  end
end

# BEFORE — HiddenGems: ternary in under_genre_cap?
genre = @curation_axis == :styles ? listing.styles.first : listing.primary_genre

# BEFORE — StorefrontCuration: genre_counts with if/else block
@genre_counts ||= if curation_axis == :styles
  eligible_listings.flat_map(&:styles).compact.tally
else
  eligible_listings.map(&:primary_genre).compact.tally
end
```

```ruby
# AFTER — Wall: polymorphic call, zero branching
genre = @curation_axis.key_for(listing)

# AFTER — Genre: matches_axis? deleted, replaced inline
candidates.select { |l| @curation_axis.matches?(l, @genre) }

# AFTER — HiddenGems: polymorphic call
genre = @curation_axis.key_for(listing)

# AFTER — StorefrontCuration: tally_from delegation
@genre_counts ||= curation_axis.tally_from(eligible_listings)
```

## Related

- [Strategy-based crate selection with uniform scoring](crate-strategies-pattern-2026-05-07.md) — The outer architecture pattern. The `CurationAxis` polymorphism lives *inside* these strategy classes; the strategies remain the selection layer while the axis owns field-level key extraction.
- PR [#244](https://github.com/body-clock/milkcrate/pull/244) — The PR introducing the feature and the polymorphism refactoring
- Issue [#245](https://github.com/body-clock/milkcrate/issues/245) — Follow-up: style filtering for narrow-catalog stores
- Sandi Metz, _Practical Object-Oriented Design in Ruby_, Chapters 5-6
- `app/services/curation_axis.rb`, `app/services/genres_axis.rb`, `app/services/styles_axis.rb`
- `spec/services/genres_axis_spec.rb`, `spec/services/styles_axis_spec.rb`
