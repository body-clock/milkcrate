---
title: "Taste-Labeling Experiment Pipeline"
date: 2026-05-19
status: draft
---


# Taste-Labeling Experiment Pipeline

## Overview

A personal, internal pipeline to refine `RecordScorer` using your own taste as ground truth. 

**The flow:**

```
Seed crate JSON  →  Round 1 (blinded)  →  Round 2 (full metadata)
                                         ↓
                          analysis/  ←  results CSV
                              ↓
                     insights → RecordScorer changes
                              ↓
                     validate against holdout fixture
                              ↓
                     log to score registry
```

---

## Step 0: Generate the Seed Crate

**What you build:** A Rake task `experiment:generate_seed` that:

1. Pulls all LP listings from the configured store
2. Scores each with the current `RecordScorer`
3. Bins them into 4 score bands:
   - **Hot** (>+5) — algorithm is confident these are cool
   - **Warm** (+1 to +5) — algorithm leans cool
   - **Lukewarm** (-1 to +1) — algorithm is uncertain
   - **Cold** (<-1) — algorithm thinks these are junk
4. Samples ~8-12 records from each band, balancing for genre and year
5. Seeds 2-3 duplicate entries (same `discogs_release_id`, different listings) for consistency checks
6. Writes a JSON file: `experiments/crate-001/seed.json`

**Schema:**

```json
[
  {
    "id": 1,
    "position": 1,
    "round": 1,
    "artist": "Miles Davis",
    "title": "Kind of Blue",
    "cover_image_url": "https://...",
    "band": "hot",
    "algorithm_score": 8.3,
    "is_duplicate_of": null,
    "is_near_duplicate_of": null
  }
]
```

The JSON is used by both the HTML labeling page and the analysis scripts. No database queries needed during labeling.

**Time to build:** ~30 min

---

## Step 1: Round 1 — Blinded Labeling

**What you build:** A single HTML page (`experiments/crate-001/label.html`) that:

1. Loads `seed.json`
2. Shows records one at a time with:
   - **Large cover image** (350×350px, centered)
   - **Artist name** below the cover
   - **Title** below the artist
3. Three big buttons: **Junk** / **Indifferent** / **Cool** (keyboard shortcuts: `j` / `i` / `k`)
4. Captures:
   - Label (junk/indifferent/cool)
   - Response time in ms (from image load to button press)
   - Timestamp
5. Progress bar at the bottom
6. At the end, exports `round1-results.json` (download link or `localStorage`)

**Design constraints:**

- No metadata beyond artist + title + cover. No genre, year, condition, price, want/have.
- Font is Georgia (serif — matches Milkcrate's body font but that's not critical here; just keep it warm)
- Cover fills most of the viewport. The record *is* the cover.
- A 2-second minimum display time before buttons become active prevents reflexive clicking.
- No back button — first impressions only, no second-guessing.

**Time to build:** ~1 hour (vanilla HTML + JS, no framework)

---

## Step 2: Round 2 — Full Metadata

**What you build:** Same HTML page, mode toggled by `?round=2` query param.

1. Loads the same `seed.json`
2. Shows records in the **same order** as Round 1
3. Displays: cover, artist, title, **plus**: year, genres, styles, condition, price, want count, have count, label, format
4. Three same buttons: Junk / Indifferent / Cool
5. Captures the same data (label, timing, timestamp)
6. After each label, if the label **flipped** from Round 1, a small optional text field appears: "What changed your mind?" (free text, not required)
7. At the end, exports `round2-results.json`

**Time to build:** ~20 min (extends Round 1 page)

---

## Step 3: Merge into Results CSV

**What you build:** A script `experiments/crate-001/merge.rb` that:

1. Reads `seed.json`, `round1-results.json`, `round2-results.json`
2. Merges into one CSV with columns:

```
position,artist,title,band,algorithm_score,
round1_label,round1_timing_ms,round1_timestamp,
round2_label,round2_timing_ms,round2_timestamp,flipped,
flip_reason,is_duplicate_of,duplicate_label_consistent,
year,genres,styles,condition,price,want_count,have_count,label,format,
vintage_score,condition_score,section_score,desirability_score,
metadata_score,cover_quality_score,freshness_score,noise_score,
has_year,has_condition,has_styles,has_notes,has_tracklist,has_cover
```

Every analysis script reads from this CSV. One source of truth.

**Time to build:** ~30 min

---

## Step 4: Analysis

### 4a. Strategy Contribution — Logistic Regression

**Script:** `analysis/logistic_regression.rb`

Fits a logistic regression where:
- **X:** 8 strategy scores (vintage, condition, section, desirability, metadata, cover_quality, freshness, noise)
- **y:** binary label (1 = cool, 0 = indifferent/junk)

**Output:**

```
=== Strategy Weights (Logistic Regression) ===
Strategy              Coefficient   Std Error   p-value   Significant?
Vintage               +1.42         0.34         0.002     ✓
Condition             +0.21         0.29         0.481     ✗
Section               +0.83         0.31         0.018     ✓
Desirability          +0.95         0.33         0.011     ✓
Metadata              -0.54         0.27         0.072     ✗
Cover Quality         +0.11         0.25         0.663     ✗
Freshness             -0.03         0.22         0.891     ✗
Noise                 +0.02         0.19         0.927     ✗

=== Suggested Weight Recalibration ===
Current weights:  2.0  1.0  3.0  5.0  -1.0  1.0  3.0  1.5
Empirical weights: 1.4  0.2  0.8  1.0  -0.5  0.1  0.0  0.0
```

**Interpretation:** Strategies with coefficients near zero and high p-values are noise for *your* taste profile. Consider reducing their weight or removing them — but see 4c first.

### 4b. Strategy Ablation

**Script:** `analysis/ablation.rb`

Runs `RecordScorer` 8 times on the seed records, each time omitting one strategy. Reports Δagreement with your labels.

**Output:**

```
=== Strategy Ablation (Δ Agreement) ===
Omitted Strategy    Agreement   Δ from Full   Impact
(none — full)       71.4%       —             baseline
− Vintage           62.9%       −8.5%         🟢 strong positive contributor
− Condition         70.0%       −1.4%         🟡 weak contributor
− Section           65.7%       −5.7%         🟢 moderate contributor
− Desirability      64.3%       −7.1%         🟢 strong contributor
− Metadata          74.3%       +2.9%         🔴 actively hurting!
− Cover Quality     72.9%       +1.5%         🔴 slightly hurting
− Freshness         72.9%       +1.5%         🔴 slightly hurting (unmeasurable in one session)
− Noise             72.9%       +1.5%         🔴 slightly hurting
```

**Interpretation:** MetadataStrategy, CoverQualityStrategy, FreshnessStrategy, and NoiseStrategy are all reducing agreement. Freshness is expected — it can't be measured in one session. But MetadataStrategy being net negative suggests the penalty is too harsh for records you actually find interesting.

### 4c. Anti-Scorer (Junk Prediction)

**Script:** `analysis/anti_scorer.rb`

Same logistic regression, but predicting `junk` (1 = junk, 0 = indifferent/cool).

**Output:**

```
=== Anti-Scorer: Predicting 'Junk' ===
Strategy              Coefficient (Cool)   Coefficient (Junk)   Discrimination?
Vintage               +1.42                -1.38               ✅ strong inverse
Condition             +0.21                -0.18               ⚠️ weak
Section               +0.83                -0.79               ✅ good inverse
Desirability          +0.95                -0.91               ✅ good inverse
Metadata              -0.54                +0.61               ✅ good inverse
Cover Quality         +0.11                -0.09               ❌ noise
Freshness             -0.03                +0.05               ❌ noise
Noise                 +0.02                -0.01               ❌ noise
```

**Interpretation:** Strategies with coefficients of opposite signs in both models are discriminating well the full spectrum. Strategies with near-zero coefficients in both models (Cover Quality, Freshness, Noise) add no predictive power for *your* taste — they're candidates for removal or redesign.

### 4d. Confusion Matrix + Signal Seam Mining

**Script:** `analysis/seams.rb`

Builds the confusion matrix, then for each error record, runs a counterfactual: "What single strategy change would flip this record's classification?"

**Output:**

```
=== Confusion Matrix ===
                 Algorithm: Cool   Algorithm: Junk
Owner: Cool      18 (TP)           5 (FN)
Owner: Junk      7 (FP)            15 (TN)

Accuracy: 73.3%  |  Precision: 72.0%  |  Recall: 78.3%

=== Signal Seams (Error Records) ===

False Positives (algorithm loves, you said junk):
  #42 - "Some Weird 80s Record" — overvalued by Vintage +2
  #87 - "Another Private Pressing" — overvalued by Section +3
  #93 - "Third Obscure Folk Record" — overvalued by Vintage + Section
  Pattern: records <1980 from small genres are consistently overvalued.
  → Candidate: introduce a cap on combined Vintage + Section bonus

False Negatives (algorithm hates, you said cool):
  #15 - "90s Hip Hop with no Discogs data" — penalized by Metadata -1
  #31 - "Modern Jazz reissue, no cover image" — penalized by CoverQuality -1
  #56 - "Indie rock with mediocre want/have" — not boosted by any strategy
  Pattern: modern records with sparse metadata or low want/have are undervalued.
  → Candidate: add a decade-aware metadata penalty (don't penalize post-1990 records for sparse metadata)
  → Candidate: add a genre-specific desirability threshold (indie/folk have lower want/have baselines)
```

### 4e. Metadata Absence Profile

**Script:** `analysis/absence_profile.rb`

For each nullable field, computes P(junk | field is absent) vs P(junk | field is present).

**Output:**

```
=== Metadata Absence Profile ===
Field Missing       P(junk|absent)   P(junk|present)   Δ     Signal?
Year                72%              41%               +31%  🟢 strong
Condition           68%              44%               +24%  🟢 strong
Styles              65%              48%               +17%  🟢 moderate
Tracklist           55%              52%               +3%   ⚪ negligible
Notes               53%              50%               +3%   ⚪ negligible
Cover Image         51%              52%               -1%   ⚪ none

=== Multi-Factor Sparsity Model ===
Absences accumulating:
  0 fields missing  → P(junk) = 35%
  1 field missing   → P(junk) = 42%
  2 fields missing  → P(junk) = 56%
  3+ fields missing → P(junk) = 74%

→ Current MetadataStrategy: flat -1 for (no styles AND <=1 genre AND no year)
→ Proposed: graduated penalty, -0.3 per missing field (year, condition, styles)
   Caps at -1.5. Year and condition absences weighted double.
```

---

## Step 5: Algorithm Refinement

Based on the analysis, make targeted changes to `RecordScorer`:

| Finding | Action |
|---------|--------|
| VintageStrategy too aggressive for combined bonuses | Cap combined Vintage + Section bonus at +3 |
| MetadataStrategy hurting accuracy for modern records | Make metadata penalty decade-aware: no penalty for records >=1990 with sparse Discogs data |
| CoverQualityStrategy not discriminating | Keep at +1/-1 but investigate whether a different cover signal exists (pressing plant, label art) |
| ConditionStrategy weak discriminator for this taste | Reduce weight from 1.0 to 0.5, or make it genre-aware |
| Absence profile shows graduated penalty needed | Replace flat -1 with graduated multi-factor penalty |
| Noise + Freshness not measurable | Leave unchanged until multi-session data exists |

Each change gets recorded in the score registry.

---

## Step 6: Holdout Registration + Score Registry

**File:** `spec/fixtures/crate-001-labels.yml`

```yaml
crate_001:
  generated_at: 2026-05-19
  records:
    - position: 1
      discogs_release_id: "123456"
      label: cool
      ...
  baseline_scores:
    - position: 1
      algorithm_score: 8.3
      algorithm_label: cool
```

**File:** `experiments/score-registry.yml`

```yaml
registry:
  - date: 2026-05-19
    crate: crate-001
    algorithm_version: baseline (8 strategies, current weights)
    accuracy: 71.4%
    label: Baseline — before any refinement
    notes: "Stratified 40-record crate. Round 1 blinded, Round 2 full metadata."

  - date: 2026-05-20
    crate: crate-001
    algorithm_version: v2 — graduated metadata penalty, vintage+section cap
    accuracy: 78.6%
    label: First refinement pass
    notes: "Increased accuracy by 7.2%. Most improvement on false negatives (modern sparse records)."
```

**Script:** `analysis/evaluate.rb` — run against the fixture, compare before/after, append to registry.

---

## Putting It All Together: Running the Pipeline

```
# Terminal 1 — generate the crate
bin/rails experiment:generate_seed[crate-001]
→ writes experiments/crate-001/seed.json

# Open the labeling page
open experiments/crate-001/label.html?round=1
→ label ~40 records (15 min)

# Next day — Round 2
open experiments/crate-001/label.html?round=2
→ re-label same records with metadata (10 min)

# Merge and analyze
ruby experiments/crate-001/merge.rb
ruby analysis/logistic_regression.rb experiments/crate-001/results.csv
ruby analysis/ablation.rb experiments/crate-001/results.csv
ruby analysis/anti_scorer.rb experiments/crate-001/results.csv
ruby analysis/seams.rb experiments/crate-001/results.csv
ruby analysis/absence_profile.rb experiments/crate-001/results.csv

# Read the outputs, make RecordScorer changes
# Register the holdout
ruby analysis/evaluate.rb crate-001
```

Total time, once built: **~25 minutes per crate** (15 labeling + 10 re-labeling + 5 analyzing + 5 refining).
