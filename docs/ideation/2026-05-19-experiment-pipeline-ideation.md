---
date: 2026-05-19
topic: experiment-pipeline
focus: crate-labeling experiment to refine RecordScorer using personal taste labels
mode: repo-grounded
---

# Ideation: Taste-Labeling Experiment Pipeline

## Grounding Context

**Codebase context:** Milkcrate is a Rails 8.1 app with an Inertia React frontend that curates a Discogs seller's vinyl inventory through a `RecordScorer` engine. The scorer uses 8 strategies (each producing a numeric score summed per listing): Vintage, Condition, Section (small-genre boost), Desirability (want/have ratio), Metadata (sparse data penalty), Cover Quality, Freshness (recency rotation), and Noise (deterministic tiebreaker). The curation layer wraps scores into `CuratedCrate` containers via `StorefrontCuration` and `CrateStrategies`.

**Past learnings:** The `crate-strategies-pattern` doc describes the architecture evolution toward uniform scoring through `RecordScorer`. The system is designed so adding a new scoring dimension automatically propagates to all crate types.

**Prior ideation:** A previous recommendation-system ideation (2026-05-14) included a "Golden Crate Evaluation Harness" concept — repeatable offline fixtures for testing curation outputs — which aligns with this experiment's holdout registry.

## Topic Axes

1. Crate construction — sampling strategy, size, diversity across genres/styles/years/conditions
2. Labeling capture — how to record labels, what "first impressions" means at a mechanical level
3. Metadata extraction & analysis — which dimensions discriminate, regression patterns, gaps in current scoring
4. Algorithm refinement — how findings translate to strategy changes, weight tuning, new strategy creation
5. Evaluation & iteration — holdout sets, before/after comparison, measuring whether refinement actually improved things

## Ranked Ideas

### 1. Stratified Score-Band Sampling

**Description:** Instead of a random or top-N crate, sample records across the algorithm's full score spectrum — roughly equal numbers from four bands: high-confidence cool (>+5), moderate (+1 to +5), near-threshold (-1 to +1), and low/negative (<-1). Within each band, balance for genre, era, condition, and metadata richness. This forces the owner to evaluate records the algorithm is uncertain about — not just obvious extremes — producing labeled data at the decision boundaries where refinement matters most.

**Axis:** Crate construction

**Basis:** `reasoned:` A random crate wastes the label budget on records the algorithm already scores correctly (either obviously good or obviously bad). The highest information-density labels come from the algorithm's decision boundaries, where small metadata changes flip the score. This is the core insight of active learning / uncertainty sampling — and it maps directly to this use case. Additionally, an adversarial variant (sampling only from bottom-quartile algorithm scores) can surface false negatives — records the algorithm is wrong about in the "junk" direction — which are the highest-leverage refinement targets.

**Downsides:** Requires pre-computing scores for the full pool and binning by band. If the score distribution is bimodal (most records are either very high or very low), some bands may be thin. Solution: accept thinner bands rather than padding with low-signal records.

**Confidence:** 92%
**Complexity:** Low (one-off Rake task to bin and select)

---

### 2. Blinded Dual-Round Labeling with Timing + Optional Depth

**Description:** Two rounds separated by at least 24 hours. **Round 1:** show cover art + artist only — no genres, no year, no condition, no price, no want/have counts. Pure visceral first impression. Instrument response time per label (milliseconds-to-decision). **Round 2:** show full metadata. Record every label that flips between rounds. The flips reveal the "metadata persuasion effect" — which metadata dimensions change the owner's mind, and in which direction. Optional: capture a lightweight free-text "why" tag on Round 2 for flipped records (e.g., "cover is ugly but want/have is strong").

**Axis:** Labeling capture

**Basis:** `direct:` The user's own framing insists on "first impressions." Blind first pass honors that. `external:` Blinded labeling is standard in clinical trials (placebo control), food science (triangle tests), and Spotify's blind listening tests. Response timing as a confidence proxy is well-established in behavioral research. `reasoned:` This isolates which RecordScorer strategies correlate with perceived appeal vs. analytical appeal — if a "cool" in Round 1 flips to "junk" in Round 2, the algorithm's DesirabilityStrategy is overriding the owner's gut, and may need a genre-aware modifier.

**Downsides:** Requires building a labeling mini-app or script that supports two-mode display. 24-hour gap means the session spans two sittings. The owner may remember Round 1 judgments and anchor (mitigated by not showing Round 1 results during Round 2, and forcing the same record order in both rounds so order effects are consistent).

**Confidence:** 88%
**Complexity:** Medium (need a simple labeling interface with metadata toggle and timing capture)

---

### 3. Strategy Contribution Analysis: Logistic Regression + Ablation + Anti-Scorer

**Description:** Three-part analysis on the same labeled data:
- **(a) Logistic regression** — fit a model with the 8 strategy scores as features and the owner's binary label as the target. This estimates empirical weights for each strategy — which actually predict the owner's judgment and by how much.
- **(b) Ablation** — run the algorithm 8 times, each omitting exactly one strategy. Compute Δagreement (with owner labels) per omission. Strategies whose removal *improves* agreement are actively hurting accuracy.
- **(c) Anti-scorer** — invert the optimization target: build a model predicting "junk" rather than "cool." Compare weights between the two models. A strategy with opposite signs in the two models is discriminating well; a strategy with the same sign in both is noise.

**Axis:** Algorithm refinement / Metadata extraction

**Basis:** `reasoned:` The RecordScorer is essentially a hand-crafted linear model with fixed weights (each strategy produces a numeric contribution, summed to a total score). Logistic regression finds the optimal weights given the data. Ablation tests whether each strategy justifies its existence. The anti-scorer catches strategies that are weak discriminators despite positive contributions. These three methods cross-validate each other: if all three agree that VintageStrategy is the strongest predictor and ConditionStrategy adds noise, you have high confidence in the finding.

**Downsides:** Requires ~40+ labeled records for reliable regression coefficients. With fewer records, the analysis can still run but confidence intervals widen. The logistic regression treats strategy scores as independent, but they may interact (e.g., VintageStrategy matters more when ConditionStrategy is also high) — interaction terms can be added but consume degrees of freedom.

**Confidence:** 85%
**Complexity:** Low (one-off analysis script, ~50 lines of Ruby)

---

### 4. Permanent Holdout Fixture + Pre-Registered Score Registry

**Description:** The labeled crate becomes a permanent evaluation fixture — persisted as seed data or a YAML fixture in `spec/fixtures/`. Pre-register the evaluation metric (e.g., mean absolute error between algorithm score rank and human label, or recall of human-liked-out-of-top-N) *before* analyzing labels. After any algorithm refinement, score the holdout with both old and new algorithms. Maintain a timestamped log showing accuracy metrics over time in a simple YAML file: "on 2026-06-01, moved VintageStrategy threshold from 1980 to 1975, holdout accuracy improved by 4%."

**Axis:** Evaluation & iteration

**Basis:** `direct:` The labeled crate is the most valuable evaluation artifact this experiment produces. Using it once and discarding it wastes that value. `external:` This follows the clinical trial practice of pre-registering analysis plans to prevent p-hacking. It also mirrors ML evaluation best practice (held-out test sets).

**Downsides:** Requires building a small evaluation script and fixture format upfront — before you have any labels. The holdout represents a sunk labeling investment that constrains future refinement unless you add more crates.

**Confidence:** 90%
**Complexity:** Low (fixture YAML file + one evaluation script)

---

### 5. Three-Category Judgment with Embedded Consistency Controls

**Description:** Expand from binary "junk/cool" to three categories: **junk** (actively dislike, skip), **indifferent** (no strong reaction — technically adequate but unexciting), **cool** (genuinely like, would consider). The "indifferent" bucket is critical — it surfaces records the algorithm scores adequately but that elicit zero emotional response. These are the algorithm's blind spots. Additionally, plant 2-3 duplicate records (same Discogs release listed twice) and 2 near-duplicates (same release, different condition grades) as internal consistency checks. After labeling, check test-retest reliability: does the owner assign the same label to duplicates? Do condition differences flip labels? If the same record is labeled differently by the same person, that's measurement noise — and it calibrates how much to trust the metadata analysis.

**Axis:** Labeling capture

**Basis:** `external:` Three-point hedonic scaling is standard in food science (ASTM Committee E18). Embedded duplicates are standard in sensory evaluation for measuring judge consistency (ISO 8586). `reasoned:` Binary labels conflate "algorithm correctly predicted junk" with "algorithm correctly predicted a record the owner feels nothing about." The "indifferent" third bucket disambiguates hollow positives from genuine false positives. Duplicate controls produce a label-reliability score (percent of duplicate pairs with matching labels), which becomes an upper bound on how well the algorithm can ever predict the owner — if you can't agree with yourself 100% of the time, the algorithm can't either.

**Downsides:** The "indifferent" category may tempt the owner to use it as a default dump for records they don't want to think about, but that's also informative — a record the owner can't be bothered to evaluate is structurally different from one they actively dislike.

**Confidence:** 83%
**Complexity:** Low (add a middle button in the labeling interface, source duplicate releases from the same store's inventory)

---

### 6. Confusion Matrix Error Analysis (Signal Seam Mining)

**Description:** After labeling, build a 2×2 confusion matrix of algorithm prediction vs. owner label. Ignore the correct cells; focus exclusively on the error cells:
- **False positives** (algorithm said cool, owner said junk)
- **False negatives** (algorithm said junk, owner said cool)

For each error record, extract the shared metadata profile. High-confidence errors (algorithm score was extreme but label was opposite) are especially informative — for each, run a counterfactual: "What single strategy change would flip this record's classification?" Aggregate across all errors to produce a ranked, quantified action plan: "Lowering VintageStrategy from +2 to +1 would correct 3 of 5 false positives."

**Axis:** Metadata extraction & analysis

**Basis:** `reasoned:` This is standard residual analysis in applied ML. Not all errors are equal — a small number of strategy misconfigurations may produce a large number of errors. By backtracing from error records to the strategy contributions, each error record directly generates a testable hypothesis about a strategy parameter, and aggregating reveals which strategy changes have the highest leverage per unit of complexity. `external:` Blind Spot Analysis / Error Profiles in ML diagnostics.

**Downsides:** A crate with only ~30 positive labels may produce too few error records in each cell for reliable aggregation. Mitigation: stratified sampling (survivor #1) ensures ample representation of algorithm-uncertain records — the ones most likely to produce errors.

**Confidence:** 80%
**Complexity:** Low (pivot table + counterfactual solver, ~30 lines of Ruby)

---

### 7. Metadata Absence Profiling

**Description:** Instead of analyzing what metadata the *yes* and *no* records *have*, analyze what they're *missing*. Build a fine-grained absence profile per record across all nullable fields: missing year, missing condition, empty styles, no notes, no tracklist, null cover image, null thumbnail. For each field, compute the conditional probability of "junk" given that field is absent. Then compare: a record missing year but having a cover image may be fine; a record missing year AND condition AND styles is likely junk. This powers a multi-factor sparsity penalty that replaces the current blunt `-1` (if styles empty AND genres ≤1 AND no year).

**Axis:** Metadata extraction & analysis

**Basis:** `reasoned:` The MetadataStrategy already penalizes sparse records, but it's a single binary flag (-1 if all three conditions are met). This treats each absence as an independent variable — some absences are strong junk predictors (no year + no condition), others are neutral (no tracklist). A fine-grained absence model could produce a graduated penalty, or reveal that sparsity in certain dimensions is actually a positive signal (rare records with no Discogs community enrichment have higher want/have than well-documented common records).

**Downsides:** Requires enough sparse records in the crate to draw statistical conclusions. If all records in the crate have complete metadata, this analysis yields nothing — the stratified crate must deliberately include underdocumented records.

**Confidence:** 75%
**Complexity:** Low (hash-map tally across nullable fields, ~20 lines of Ruby)

---

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Track-level labeling (listen per track) | Too expensive relative to value for a first experiment |
| 2 | Maximalist 200-record crate | Scope overrun — changes experiment character and cognitive load |
| 3 | Triage threshold / defer zone | Product architecture decision, not experiment design |
| 4 | Inverted labeling (algorithm predicts, owner confirms) | Introduces anchoring bias that outweighs efficiency gain |
| 5 | Serendipity strategy as standalone refinement | Informative premise but not an experiment design — belongs in brainstorm phase |
| 6 | Algorithm-as-curator bootstrap loop | Too ambitious for first experiment — valuable as follow-up after baseline |
| 7 | Operationalize "junk" definition pre-labeling | Definition shifts record-to-record; better measured post-hoc from data |
| axis: algorithm refinement | recovery skipped (cap reached) — see survivor #3 for main refinement techniques |
