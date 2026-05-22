---
title: "feat: Taste-Labeling Experiment Pipeline"
type: feat
status: completed
date: 2026-05-19
origin: docs/experiment-pipeline.md
---

# feat: Taste-Labeling Experiment Pipeline

## Summary

Build an internal experiment pipeline that lets you refine `RecordScorer` by taste-labeling a stratified crate of ~40 records, then running five analysis scripts (logistic regression, ablation, anti-scorer, confusion matrix, absence profile) against the results. The pipeline produces a permanent holdout fixture and a score registry so every algorithm change is validated against labeled data over time.

---

## Problem Frame

`RecordScorer` has 8 strategies with hand-tuned weights, but there's no mechanism to validate whether those weights actually predict which records are interesting. Tuning is done by intuition. Without human-labeled ground truth, we can't tell if a change to VintageStrategy from +2 to +1 makes the algorithm better or worse. This pipeline creates a structured, repeatable label-tune-measure loop — internal tooling only, nothing user-facing.

---

## Requirements

- R1. Generate a stratified seed crate of ~40 records sampled across the algorithm's score bands (hot/warm/lukewarm/cold) with genre balance and embedded duplicate records
- R2. Provide a standalone HTML labeling page with two modes: Round 1 (cover + artist only, blinded) and Round 2 (full metadata)
- R3. Capture label (junk/indifferent/cool), response timing, round flips, and optional flip reasons
- R4. Merge both rounds into a single analysis CSV with all metadata and per-strategy scores
- R5. Analyze labels via five scripts: logistic regression, ablation, anti-scorer, confusion matrix/seams, and metadata absence profiling
- R6. Register the labeled crate as a permanent holdout fixture and maintain a timestamped score registry
- R7. Run an initial experiment crate to baseline the pipeline

---

## Scope Boundaries

- Not a user-facing feature — no routes, controllers, Inertia pages, or UI changes to the storefront
- No database changes — no new migrations, models, or columns
- No changes to RecordScorer strategies or their weights (those come *after* the analysis)
- No continuous integration or automated runs — the pipeline is manual by design
- No multi-store support in v1 — runs against the configured demo store

---

## Context & Research

### Relevant Code and Patterns

- `lib/tasks/milkcrate.rake` — existing Rake tasks under `namespace :milkcrate`, all with `=> :environment` and `puts` for output
- `app/models/record_scorer.rb` — accepts `strategies:` hash injection, perfect for analysis variant testing
- `app/services/score_strategies/*.rb` — eight strategies each implementing `score(listing)`
- `spec/tasks/milkcrate_rake_spec.rb` — Rake task test pattern with `before(:all) { Rake.application = Rake::Application.new; Rails.application.load_tasks }`
- `spec/factories/listings.rb` — Listing factory with sensible defaults and sequencing
- `spec/factories/record_scorers.rb` — RecordScorer factory accepting `genre_counts` and `today`
- `app/values/want_have_ratio.rb` — `Data.define` value object pattern

### Institutional Learnings

- **Crate-strategies pattern** (`docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`): score once, filter per category. Analysis scripts should replicate this optimization when re-scoring the full catalog.
- **Discogs rate-limit middleware** (`docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md`): concurrency patterns are irrelevant here — the pipeline uses pre-scored `seed.json` data, not live API calls.
- **No existing experiment infrastructure**: this is greenfield tooling. After landing, document in `docs/solutions/architecture-patterns/`.

---

## Key Technical Decisions

- **Rake namespace:** Use `experiment:` as the top-level namespace (not `milkcrate:experiment:`) — cleaner for standalone tooling. Verify no conflict with Rails' built-in `experiment` feature.
- **Seed generator as service object:** Stratified sampling logic lives in `app/services/experiments/seed_generator.rb` — testable without Rake overhead. The Rake task is a thin wrapper that calls it and writes the JSON.
- **Single HTML page, two modes:** The labeling page uses `?round=1` / `?round=2` query params, not two separate HTML files. The seed JSON is loaded via `fetch()` from the local filesystem.
- **Analysis scripts in `analysis/`:** Plain Ruby scripts (not Rails-dependent) reading CSV input. This keeps them fast and runnable without `rails runner`.
- **Holdout fixture in `spec/fixtures/`:** The path is already configured in `rails_helper.rb`. YAML format with per-record labels and baseline algorithm scores.
- **Score registry in `experiments/score-registry.yml`:** Append-only YAML file, one entry per algorithm change evaluation.

---

## Implementation Units

### U1. Experiment infrastructure scaffold

**Goal:** Create the directory structure, `.gitignore` rules, and settings config so all downstream units have a home.

**Requirements:** R1 (prerequisite for crate generation)

**Dependencies:** None

**Files:**
- Create: `experiments/.gitkeep`
- Create: `analysis/.gitkeep`
- Modify: `.gitignore`
- Modify: `config/settings.yml`

**Approach:**
- Create `experiments/` (labeling pages, seed JSON, results CSVs) and `analysis/` (Ruby scripts) directories with `.gitkeep` markers
- Add `experiments/` to `.gitignore` — seed data and results are per-session artifacts
- **Do not** gitignore `analysis/` — scripts are committed
- Add `experiments:` section to `config/settings.yml` with defaults for band thresholds, sample size, and duplicate count:

```yaml
experiments:
  crate_size: 40
  bands:
    hot_threshold: 5.0
    warm_threshold: 1.0
    cold_threshold: -1.0
  samples_per_band: 10
  duplicate_count: 2
```

**Patterns to follow:**
- `config/settings.yml` existing structure (nested YAML, snake_case keys)

**Test scenarios:**
- No behavioral tests needed for scaffolding

**Verification:**
- Directories exist, `.gitignore` has the right entries, `Settings.experiments.crate_size` returns 40

---

### U2. Seed crate generator

**Goal:** Build a Rake task + service object that scores all listings, stratifies by score band, samples balanced records, and writes `experiments/crate-001/seed.json`.

**Requirements:** R1

**Dependencies:** U1

**Files:**
- Create: `app/services/experiments/seed_generator.rb`
- Create: `spec/services/experiments/seed_generator_spec.rb`
- Create: `lib/tasks/experiment.rake`
- Create: `spec/tasks/experiment_rake_spec.rb`

**Approach:**
- **`Experiments::SeedGenerator`** service object with `.call(store_id:, crate_name:)` interface:
  1. Queries all LP listings for the store
  2. Builds a `RecordScorer` with current genre counts
  3. Scores each listing, bins into hot/warm/lukewarm/cold buckets using band thresholds from `Settings.experiments.bands`
  4. Samples `Settings.experiments.samples_per_band` from each bucket, balancing for primary_genre diversity (no single genre > 40% of any band's sample)
  5. Injects `Settings.experiments.duplicate_count` duplicate entries by finding listings with matching `discogs_release_id`
  6. Returns a `Result` data object with `seed_data` array and metadata (sample counts per band, timestamp)
- **Rake task** `experiment:generate[crate_name]`:
  1. Calls `SeedGenerator.call(store_id: demo_store.id, crate_name:)`
  2. Writes JSON to `experiments/<crate_name>/seed.json`
  3. Creates `experiments/<crate_name>/` directory if needed
  4. Prints summary: band counts, duplicate count, total records

**Patterns to follow:**
- `StoreSyncService::Result = Data.define(...)` for the `SeedGenerator::Result` return type
- `ScoreStrategies` for the stratified sampling — score once, then filter
- `lib/tasks/milkcrate.rake` for Rake task structure (`desc`, `task :name => :environment`, `raise "Usage:"` guard, `demo_store` helper)

**Test scenarios:**
- Happy path: generates 40 records across 4 bands with expected distribution
- Edge case: fewer listings than requested sample size in a band — fills what's available, logs a warning
- Edge case: no duplicate listings found — skips duplicates, crate has fewer records
- Edge case: single-genre store — genre diversity constraint relaxes to allow up to 60% from one genre
- Integration: calling `SeedGenerator.call` with a real `store` with known listings produces valid JSON schema
- Error: store with no LP listings raises `Experiments::SeedGenerator::Error`

**Verification:**
- `rake experiment:generate[crate-001-verify]` writes a valid JSON file at `experiments/crate-001-verify/seed.json`
- JSON validates against the expected schema (array of objects with position, artist, title, cover_image_url, band, algorithm_score, is_duplicate_of)

---

### U3. Labeling HTML page (Rounds 1 & 2)

**Goal:** A single standalone HTML page that loads seed JSON and provides the dual-round labeling flow: blinded first pass, full-metadata second pass.

**Requirements:** R2, R3

**Dependencies:** U2 (depends on seed JSON schema for the input format)

**Files:**
- Create: `experiments/crate-001/label.html` (template — copy per crate run)

**Approach:**
- Single HTML file with embedded CSS + vanilla JS (no framework, no build step)
- **Page modes** controlled by `?round=1` (default) or `?round=2` query param
- **Round 1 display:**
  - Large cover image (~70vh, centered)
  - Artist + title below in serif font
  - Three buttons: **Junk** / **Indifferent** / **Cool** with keyboard shortcuts J / I / K
  - Buttons disabled for first 2 seconds (prevents reflexive clicking)
  - Progress bar at bottom: "Record 7 of 40"
  - No back/previous button
- **Round 2 display:**
  - Same cover + artist + title
  - Metadata panel below: year, genres, styles, condition, price, want/have, label, format
  - Same three buttons
  - After each label, if the label differs from Round 1, an optional text field appears: "What changed your mind?"
  - Same progress bar, no back button
- **Data capture:**
  - On each label: record label value, elapsed ms since image load, timestamp
  - Round 2 additionally: whether label flipped from Round 1, optional flip reason
- **Export:**
  - Round 1: "Download Results" button saves `round1-results.json`
  - Round 2: "Download Results" button saves `round2-results.json`
  - Both use `localStorage` as auto-save backup (optional — suggest but don't require)
- **Data flow:** HTML loads `seed.json` via `fetch('seed.json')` (same directory, no server needed when opened via `file://` or any static server)

**Design constraints (from pipeline doc):**
- Cover fills most of the viewport. The record *is* the cover.
- Font: serif (Georgia or system serif stack)
- No back button — first impressions only
- 2-second minimum display before buttons activate
- Keyboard shortcuts for speed

**Patterns to follow:**
- None in this project — this is the first standalone HTML page

**Test scenarios:**
- No automated tests for HTML page (vanilla JS, no test framework)
- Manual verification checklist described in Verification below

**Verification:**
- Open `experiments/crate-001/label.html?round=1` from `file://`, confirm it loads `seed.json` and shows the first record
- Round 1: press J / I / K, confirm progression, timing capture, and download
- Round 2: open with `?round=2`, confirm metadata panel appears, confirm flip detection works
- Both rounds: confirm keyboard shortcuts J/I/K, confirm 2-second button delay
- Confirm exported JSON files have the correct schema (position, label, timing_ms, timestamp)

---

### U4. Merge + analysis scripts

**Goal:** Build the merge script and all five analysis scripts, each reading from the merged CSV.

**Requirements:** R4, R5

**Dependencies:** U1, U3 (depends on result JSON schema)

**Files:**
- Create: `analysis/merge.rb`
- Create: `analysis/logistic_regression.rb`
- Create: `analysis/ablation.rb`
- Create: `analysis/anti_scorer.rb`
- Create: `analysis/seams.rb`
- Create: `analysis/absence_profile.rb`
- Create: `analysis/README.md`

**Approach:**

All scripts are plain Ruby (no Rails dependency, no Gemfile additions other than stdlib). Input: CSV path as first argument. Output: printed to stdout with `=== Section Headers ===`.

- **`merge.rb`**: Reads `seed.json`, `round1-results.json`, `round2-results.json` from the same directory. Matches by `position`. Enriches each row with per-strategy scores (re-scores each listing using `RecordScorer` loaded via `-I app` from the project root) and boolean absence flags for nullable fields. Writes `results.csv`.

- **`logistic_regression.rb`**: Fits logistic regression on 8 strategy score features vs binary label (cool=1, junk/indifferent=0) using Ruby's `matrix` stdlib or a simple gradient descent implementation. Outputs coefficient table with standard errors and p-values, plus suggested weight recalibration.

- **`ablation.rb`**: Runs `RecordScorer` 8 times, each omitting one strategy, computing Δagreement with human labels. Requires loading the Rails app's scoring classes. Run from project root: `ruby -I app -r active_support analysis/ablation.rb results.csv`.

- **`anti_scorer.rb`**: Same logistic regression with inverted target (junk=1). Outputs dual-coefficient table: cool-predictor vs junk-predictor with discrimination assessment.

- **`seams.rb`**: Builds confusion matrix, enumerates false positives and false negatives with per-record counterfactuals. For each error record, determines which single strategy change would flip it.

- **`absence_profile.rb`**: For each nullable field, computes P(junk | absent) vs P(junk | present). Builds cumulative sparsity model.

**Patterns to follow:**
- `ScoreStrategies` for per-strategy score computation in ablation.rb
- `RecordScorer.new(strategies:)` injection for strategy omission testing

**Test scenarios:**
- No automated tests for analysis scripts (one-off research tools)
- They read CSV, compute, print — test by running against known data

**Verification:**
- Create a small test CSV (5 records, known labels) and run each script against it
- `merge.rb`: confirm output CSV has all expected columns (40+ columns)
- `logistic_regression.rb`: confirm it runs and prints a coefficient table
- `ablation.rb`: confirm it reports Δagreement for each omission
- `anti_scorer.rb`: confirm dual-coefficient output
- `seams.rb`: confirm confusion matrix and error records
- `absence_profile.rb`: confirm conditional probability table

---

### U5. Holdout registration + evaluation script

**Goal:** Build the evaluation script that scores a labeled crate against both old and new algorithm versions, writes the holdout fixture, and maintains the score registry.

**Requirements:** R6

**Dependencies:** U4 (depends on results CSV format)

**Files:**
- Create: `analysis/evaluate.rb`
- Create: `spec/fixtures/crate-001-labels.yml`
- Create: `experiments/score-registry.yml`

**Approach:**

- **`evaluate.rb`**: Reads `results.csv`, computes agreement metrics (accuracy, precision, recall, F1) between algorithm prediction and human label. Accepts optional second argument for "before" accuracy to compute Δ. Appends to `experiments/score-registry.yml` with date, crate name, accuracy, version label, and notes.

- **Holdout fixture** `spec/fixtures/crate-001-labels.yml`: YAML file with per-record `position`, `discogs_release_id`, `label`, `algorithm_score`, `algorithm_label`. Written by the user after running the first full pipeline, not by automation.

- **Score registry** `experiments/score-registry.yml`: Append-only. One YAML document per entry. Written by `evaluate.rb` after each evaluation.

**Patterns to follow:**
- `spec/fixtures/` is already configured in `rails_helper.rb` — no setup needed
- Existing fixtures pattern (though none exist yet for label data)

**Test scenarios:**
- No automated tests — manual workflow

**Verification:**
- Run `ruby analysis/evaluate.rb experiments/crate-001/results.csv` after a pipeline run
- Confirm it prints accuracy and other metrics
- Confirm `experiments/score-registry.yml` has a new entry
- Confirm `spec/fixtures/crate-001-labels.yml` has the correct YAML structure

---

### U6. Run initial experiment crate

**Goal:** Generate the first seed crate, run through both labeling rounds, merge, analyze, and register the baseline holdout. This validates the pipeline end-to-end and produces the first baseline score.

**Requirements:** R7

**Dependencies:** U2, U3, U4, U5

**Files:**
- Create: `experiments/crate-001/seed.json` (generated by U2)
- Create: `experiments/crate-001/label.html` (copy of template from U3)
- Create: `experiments/crate-001/round1-results.json` (generated by labeling)
- Create: `experiments/crate-001/round2-results.json` (generated by labeling)
- Create: `experiments/crate-001/results.csv` (generated by merge.rb)
- Create: `spec/fixtures/crate-001-labels.yml` (written by user)
- Modify: `experiments/score-registry.yml` (appended by evaluate.rb)

**Approach:**
- This is a manual execution unit, not build code
- The user runs the pipeline themselves:
  1. `rake experiment:generate[crate-001]` → writes seed.json
  2. Open `label.html?round=1`, label 40 records (~15 min)
  3. Next day, open `label.html?round=2`, re-label (~10 min)
  4. `ruby analysis/merge.rb experiments/crate-001/` → writes results.csv
  5. Run each analysis script against results.csv
  6. Write `spec/fixtures/crate-001-labels.yml` from results
  7. `ruby analysis/evaluate.rb experiments/crate-001/results.csv` → registers baseline

**Patterns to follow:**
- Documented in `docs/experiment-pipeline.md` "Putting It All Together" section

**Test scenarios:**
- Not applicable — manual execution

**Verification:**
- Score registry has a baseline entry
- Analysis scripts produce interpretable output
- Holdout fixture is committed to the repo

---

## System-Wide Impact

- **Interaction graph:** No callbacks, middleware, or observers are affected. The pipeline is entirely standalone.
- **Error propagation:** Analysis scripts print errors to stderr and exit non-zero on malformed input. They don't raise exceptions into Rails error handling.
- **State lifecycle risks:** None — the pipeline reads DB data (via the Rake task) and writes files. It never modifies production data.
- **API surface parity:** No external API surfaces changed.
- **Integration coverage:** The generate Rake task is the only unit that touches both ActiveRecord and file I/O. The merge script loads Rails model code via `-I` for strategy re-scoring.
- **Unchanged invariants:** RecordScorer, its strategies, the storefront curation pipeline, and all user-facing code are completely untouched.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Rails `experiment` namespace conflict | Verify by running `rails --tasks | grep experiment` before merging. If conflict, namespace under `milkcrate:experiment:` |
| Labeling page must load seed.json from `file://` (CORS) | Use `fetch()` without CORS headers — `file://` works for same-directory `fetch()` in modern browsers. Fallback: instruct to use `python3 -m http.server` in the experiments directory |
| Analysis scripts need Rails model access (RecordScorer strategies) | Scripts load via `ruby -I app -r active_support` or are designed as Rake tasks when Rails dependency is unavoidable |
| Single crate (n=40) produces thin signals for some analyses | Accept this — the pipeline is designed to accumulate crates over time. Document the limitation in each script's output |

---

## Sources & References

- **Origin document:** `docs/experiment-pipeline.md` — concrete pipeline design from ideation
- **Related ideation:** `docs/ideation/2026-05-19-experiment-pipeline-ideation.md` — full ideation artifact with survivor ranking and rejection summary
- Related code: `app/models/record_scorer.rb`, `app/services/score_strategies/*.rb`
- Related patterns: `lib/tasks/milkcrate.rake`, `spec/tasks/milkcrate_rake_spec.rb`
