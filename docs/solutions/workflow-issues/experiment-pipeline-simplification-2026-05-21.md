---
title: "Experiment Pipeline Simplification and Scoring Recalibration"
date: 2026-05-21
category: workflow-issues
module: experiments
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - "Building or modifying experiment pipelines for taste-labeling or curation validation"
  - "Calibrating scoring strategies with multiple competing signals"
  - "Designing seed generation for human-in-the-loop classification tasks"
tags:
  - experiments
  - pipeline
  - scoring
  - calibration
  - record-scorer
  - seed-generation
---

# Experiment Pipeline Simplification and Scoring Recalibration

## Context

The experiment pipeline was built to validate the `RecordScorer` algorithm by
having a human label records as junk, indifferent, or cool and comparing those
labels against algorithm scores. The initial design went too far: 7 analysis
scripts, 2-round labeling (blind then with metadata), stratified seed
generation across 4 scoring bands with genre balancing and duplicate
injection, and a score registry. The user described it as "beyond what I can
reasonably comprehend."

The core need was much simpler: generate a crate of the algorithm's
highest-scored records, label them yes/no/meh, and see what the algorithm got
wrong and why.

## Guidance

### 1. Start with the simplest useful pipeline

The minimal viable experiment pipeline has three steps:

1. **Generate** — take the algorithm's top N scored records as a seed crate
2. **Label** — one pass with full metadata, three labels (junk/indifferent/cool)
3. **Report** — show score ranges per label and the highest-scoring not-cool records with per-strategy breakdowns

Add complexity only when a specific question requires it. The original pipeline
added stratification, genre balancing, blind rounds, and 7 analysis scripts
before any labeling had been done — most of which was removed without ever
producing actionable insights.

### 2. Seed from the top, not across bands

Stratified sampling (picking records from each scoring band) wastes labels on
records the algorithm already knows are bad. The disagreement signal is most
valuable at the high-confidence boundary — records the algorithm thinks are
great that a human disagrees with. Generate crates from the algorithm's
highest-scored records only:

```ruby
top_n = scored.sort_by { |e| -e[:score] }.first(crate_size)
```

### 3. De-duplicate across crates

Labeling the same record twice is wasted effort. Before generating a new crate,
scan existing results and exclude already-labeled `release_id` values:

```ruby
Dir.glob("experiments/*/results.json").flat_map do |path|
  JSON.parse(File.read(path)).map { |r| r["release_id"] }
end
```

### 4. Show score breakdowns, not just totals

The most actionable insight comes from seeing *why* a record scored what it
did, not just the final number. Include per-strategy breakdowns in the seed
data and surface them after each label is cast. This lets the labeler
immediately identify patterns like "vintage is boosting everything to junk."

### 5. Calibrate competing strategies iteratively

When multiple scoring strategies compete, one will inevitably dominate. The
process of calibration is:

1. Label a crate with current weights
2. Check the cross-crate analysis for gap patterns (high-scoring junk vs
   low-scoring cool)
3. Identify which strategies over-contribute to junk
4. Adjust one or two at a time, regenerate, and re-label

This iterative approach is more reliable than trying to set all weights
correctly upfront.

## Why This Matters

A complex experiment pipeline creates friction that prevents iterative
testing. If running a crate, analyzing results, and adjusting weights takes
hours, people stop doing it. A pipeline that takes minutes encourages more
frequent calibration cycles, which produces a better-tuned algorithm.

The scoring calibration story illustrates this directly: starting from a
baseline where desirability (+5) dominated everything, the team iterated
through 6 crates and progressively reduced desirability (5 → 3 → 1),
narrowed vintage (pre-1980 → 1960-1979), reduced vintage boost (2 → 1), and
removed section entirely. Each step was informed by the previous crate's
labels. That loop only works when the pipeline lets you move fast.

## When to Apply

- When designing a human-in-the-loop evaluation pipeline for a scoring
  algorithm — start with the simplest useful flow and add only what the data
  demands
- When multiple scoring strategies compete — measure the gap between
  high-scoring junk and low-scoring cool to find which strategies are
  over-contributing
- When running experiments locally — disable freshness or other recency-based
  signals that have no differentiating power against a static database

## Examples

### Scoring recalibration progression

| Crate | Desirability | Vintage | Section | Cool rate |
|-------|-------------|---------|---------|-----------|
| 001 | +5 / LOG_CAP 4 | +2, pre-1980 | +3 | 28% |
| 002 | disabled | +2, pre-1980 | +3 | 13% |
| 003 | disabled | +2, pre-1980 | +3 | 13% |
| 004 | disabled | +1, 1960-79 | +2 | 13% |
| 005 | +3 / LOG_CAP 4 | +1, 1960-79 | +2 | 58% |
| Current | +1 / LOG_CAP 2 | +1, 1960-79 | removed | TBD |

The cool rate jumped from ~13% to 58% when desirability was re-enabled at a
reduced bonus. Removing section further cleaned up the signal by eliminating
a diversity mechanism that was masquerading as a quality signal.

### Cross-crate gap analysis

After 4 crates (160 labels), the gap analysis showed:

| Strategy | Gap (junk - cool) | Interpretation |
|----------|------------------|----------------|
| Vintage | +1.30 | Over-boosts junk — old records the user doesn't want |
| Section | +1.10 | Over-boosts junk — obscure genre records |
| Cover Quality | 0.00 | Neutral |
| Freshness | 0.00 | Neutral |

This directly drove the decision to narrow vintage's window and remove
section.

## Related

- [Strategy-based crate selection with uniform scoring](../architecture-patterns/crate-strategies-pattern-2026-05-07.md) — the storefront curation architecture that uses the same RecordScorer
- [Discogs rate limit middleware](../integration-issues/discogs-rate-limit-middleware-2026-05-19.md) — related infrastructure for syncing store inventory used by experiments
