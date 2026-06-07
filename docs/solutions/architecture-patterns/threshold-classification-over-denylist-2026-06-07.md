---
title: "Let counting be classification — removing curated denylists from threshold-based tiering"
date: 2026-06-07
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Designing support-threshold classifiers that group items into tiers by frequency"
  - "Considering a curated denylist or overlap-based suppression to exclude 'too broad' items"
  - "Classification already sorts by count or frequency as the primary metric"
symptoms:
  - "Broad-style suppression list was rock-only, unable to generalize to electronic, jazz, or hip-hop stores"
  - "Curated denylist required per-genre-family maintenance to stay effective across all Discogs genres"
  - "Two independent code reviews did not flag the genre-bias problem"
tags:
  - threshold-classification
  - style-selection
  - counting-is-classification
  - curated-denylist
  - over-engineering
---

# Let counting be classification — removing curated denylists from threshold-based tiering

## Context

The `StyleSelection` domain object (`app/models/style_selection.rb`) classifies a store's Discogs styles into tiers for crate allocation and thematic rotation on narrow-catalog stores. The tier rules are support-threshold based:

| Tier | Rule |
|------|------|
| **Main** | Styles with ≥5% of eligible listings (floored at `MIN_RECORDS`) |
| **Rotation** | Styles with ≥1% but below the main threshold (floored at `MIN_RECORDS`) |
| **Omitted** | Styles below the rotation threshold |

Originally, there was a fourth tier — **suppressed** — enforced by a curated denylist with co-occurrence analysis. The `BROAD_STYLES` constant listed five rock sub-genres (Pop Rock, Classic Rock, Hard Rock, Blues Rock, Rock & Roll). If a broad style's listings overlapped ≥75% with qualifying non-broad styles, the broad style was excluded from main crates and thematic rotation even if its count met the thresholds.

The purpose was to prevent overly general Discogs labels from drowning out distinctive sub-genres — a genuine concern that motivated the feature's design (issue [#245](https://github.com/body-clock/milkcrate/issues/245)).

## What Didn't Work

**The denylist was genre-specific and couldn't generalize.** The plan from `ce-plan` and two independent code review passes all accepted the approach without flagging the genre bias. It took a developer questioning the constant during implementation to realize the limitation:

- A store selling electronic music had no mechanism to suppress "Electronic", "Ambient", or "Experimental" — those weren't in `BROAD_STYLES`.
- A jazz store had no way to suppress "Jazz" as a broad Discogs style.
- Expanding the list to cover every genre family would require continuous product judgment and per-genre maintenance.

The overlap-based suppression mechanism re-classified styles based on the same data that already produced their support counts — if "Electronic" had 200 listings in an electronic store, the count already signalled it was a dominant category. Suppressing it would contradict the data.

## Guidance

**When your classification is already sorting by support count (or frequency), you do not need an additional curation layer to suppress "too broad" items. Counting IS classification for this domain.**

The argument in full:

1. **Support count already measures relevance.** If "Electronic" accounts for 30% of an electronic store's listings, it *is* a dominant category in that store. Suppressing it would misrepresent the store's actual inventory.
2. **Curated denylists are genre-specific by nature.** You cannot maintain one list for every genre family (rock, electronic, jazz, hip-hop, world, folk). Any hardcoded list encodes product judgment for *one* genre and silently does nothing for others — creating false consistency.
3. **The threshold breakpoints (≥5% main, ≥1% rotation) are the effective curation layer.** A "too broad" style in a store that barely stocks that genre will naturally fall below the 1% threshold and land in Omitted. The only styles that reach Main are genuinely dominant in that store — which is the correct behavior.

### Implementation pattern

Do not add denylists or overlap-based suppression to a support-thresholds classifier. If the data-driven thresholds are giving bad results, examine the thresholds and input data (e.g., raw Discogs style tags), not the sorting function.

```ruby
# Before: ~55 lines of implementation + ~180 lines of tests
# BROAD_STYLES constant, SUPPRESSION_RATIO, overlapping calculation,
# suppression-aware tiering branch, broad-only store fallback

BROAD_STYLES = %w[
  Blues\ Rock Classic\ Rock Hard\ Rock Pop\ Rock Rock\ &\ Roll
].freeze
SUPPRESSION_RATIO = 0.75

def suppressed?(name)
  return false unless BROAD_STYLES.include?(name)
  return false if support[name].nil? || support[name].zero?
  count_broad_overlap(name).to_f / support[name] >= SUPPRESSION_RATIO
end

def main_styles
  support.select { |name, count|
    count >= MIN_RECORDS &&
    count >= threshold &&
    !suppressed_styles.include?(name)  # extra check
  }.keys.sort
end
```

```ruby
# After: 17 lines of implementation logic, 26 test examples
# Three-tier classification driven purely by support thresholds

def main_styles
  support.select { |name, count|
    count >= MIN_RECORDS && count >= (total_listings * MAIN_THRESHOLD).ceil
  }.keys.sort
end

def rotation_styles
  support.select { |name, count|
    next false if main_styles.include?(name)
    count >= MIN_RECORDS && count >= (total_listings * ROTATION_THRESHOLD).ceil
  }.keys.sort
end
```

## Why This Matters

- **Maintenance burden.** The denylist approach was rock-specific. No one was going to maintain equivalent lists for 20+ genre families. The result is a system that appears to handle "noise" but silently only handles one genre.
- **False consistency.** An electronic store had no mechanism to suppress "Electronic" or "Ambient." The code and plan mentioned suppression generally, but it only fired for rock. The system looked consistent but was silently asymmetric.
- **Over-engineering signal.** The overlap calculation re-classified styles based on the *same data* that produced their support counts. The co-occurrence check (`count_broad_overlap`) iterated every listing's style set to compute an overlap ratio that would, at best, confirm what the raw count already showed. (session history)
- **Test tax.** The suppression machinery required ~180 lines of tests (7 examples in `style_selection_spec.rb`, plus integration tests in `styles_axis_spec.rb`, `storefront_curation_spec.rb`, and `stores_spec.rb`). The three-tier classification needs ~26 examples.

## When to Apply

- You are building a classifier that groups items by support count, frequency, or proportional thresholds.
- Someone proposes adding a "don't show X even if it qualifies" list — especially a curated one.
- The items being suppressed are already sorted by the same metric used to determine their tier.
- The denylist covers only a subset of possible categories and would need to be extended asymmetrically across genre families.

**Counter-indication:** If thresholds alone produce bad results for a specific known pattern (e.g., a universally-applied Discogs parent tag that appears on every listing and has maximum support), consider data preprocessing (cleaning input tags) before adding a classification-layer filter.

## Examples

**Before — denylist + overlap suppression:**

```ruby
BROAD_STYLES = %w[Pop Rock Classic Rock Hard Rock Blues Rock Rock & Roll].freeze
SUPPRESSION_RATIO = 0.75

def suppressed?(style_name)
  return false unless BROAD_STYLES.include?(style_name)
  overlap_ratio(style_name) >= SUPPRESSION_RATIO
end
# Plus: qualifying_non_broad_styles, compute_suppressed,
#       suppressible?, count_broad_overlap
```

**After — pure threshold-based tiering:**

```ruby
MAIN_THRESHOLD = 0.05
ROTATION_THRESHOLD = 0.01

def main_styles
  support.select { |name, count|
    count >= MIN_RECORDS && count >= (total_listings * MAIN_THRESHOLD).ceil
  }.keys.sort
end

def rotation_styles
  support.select { |name, count|
    next false if main_styles.include?(name)
    count >= MIN_RECORDS && count >= (total_listings * ROTATION_THRESHOLD).ceil
  }.keys.sort
end
```

The denylist was removed entirely (~55 LOC of implementation, ~180 LOC of tests). The three-tier system (main / rotation / omitted) now stands on support thresholds alone.

## Related

- Issue [#245](https://github.com/body-clock/milkcrate/issues/245) — Styles selection: filter noise, surface distinctive sub-genres for narrow-catalog stores
- PR [#246](https://github.com/body-clock/milkcrate/pull/246) — feat(styles): select distinctive styles for narrow-catalog stores
- `docs/solutions/architecture-patterns/replace-type-code-with-polymorphism-2026-06-07.md` — The CurationAxis polymorphism that StyleSelection runs inside
- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — The crate selection pipeline that consumes StyleSelection classifications
- `app/models/style_selection.rb` — The refactored class
- `spec/models/style_selection_spec.rb` — 26 examples replacing ~180 lines of suppression tests
