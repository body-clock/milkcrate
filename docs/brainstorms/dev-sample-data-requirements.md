# Dev Sample Data — Requirements

**Date:** 2026-05-24
**Status:** Draft for review

## Problem

Local development relies on syncing `philadelphiamusic` — a store with ~90k listings — via the Discogs API. A full sync takes minutes, enrichment jobs add more time, and the sheer volume makes iteration slow. For simple UI tweaks, algorithm experiments, or curation logic changes, developers wait through a heavyweight pipeline before they can see results.

The existing rake tasks (`sync`, `enrich`, `curate`, `setup`, `stats`, `score`, `reset_surfacing`) are also misleadingly named — they sound generic but all hardcode a single store via `Settings.demo_store`. The app has moved past the single-store demo phase and now onboards real stores. The task structure needs to reflect that.

## Goal

A fast, deterministic way to populate the development database with ~1,000 realistic sample records so that local iteration on browsing, curation, and algorithm behavior takes seconds, not minutes. Along the way, reorganize the rake tasks into clear namespaces that separate dev environment lifecycle from per-store operations.

## Summary

A static JSONL snapshot of ~1,000 real Discogs listings captured from philadelphiamusic, committed to the repo and loadable on demand via `tools:load` — making local development fast by replacing the heavyweight Discogs sync pipeline with a deterministic, sub-second load.

## Users

- The developer (you), multiple times per day
- Future contributors who clone the repo and need a working dev environment

## Non-Goals

- A production seed strategy (this is dev-only)
- Data freshness guarantees — the snapshot will be a point-in-time capture
- Testing infrastructure (the sample data is for dev browsing, not spec fixtures)
- Any changes to CI or deployment pipelines
- Changes to the experiment/labeling workflow (separate concern)

## Requirements

### R-1: Static JSONL snapshot

A file at `db/sample/listings.jsonl` containing ~1,000 real Discogs listings as JSONL (one JSON object per line), committed to the repo. Each line includes the listing, its associated release, its store, and its store_owner.

### R-2: Real data only

Data is captured from a synced real store (philadelphiamusic) via the existing StoreSync pipeline — not fabricated, not drawn from an API at load time.

### R-3: Representative data

The snapshot captures the 1,000 most-recent available LP listings to ensure genre diversity, realistic want/have distributions (0–500+), varied conditions (Mint, NM, VG+, VG, G), formats spanning LP/Album represses, years 1950s–2020s, and meaningful price variation.

### R-4: Two load modes

- **Default (idempotent):** `find_or_create_by!` on `discogs_listing_id` / `discogs_release_id` / `discogs_username`. Safe to re-run — skips existing records.
- **`--force` (clean slate):** Destroys all Listing, Release, Store, StoreOwner records in dependency-safe order, then loads fresh.

### R-5: Rake task reorganization

Replace the monolithic `milkcrate.rake` with two new files:

**`lib/tasks/tools.rake`** — Dev environment lifecycle:
- `tools:start` — `docker compose up -d`, wait for postgres health, `db:create`, `db:migrate`, `tools:load`
- `tools:load` — Load `db/sample/listings.jsonl` (`--force` for clean slate)
- `tools:capture` — Capture fresh JSONL from a synced real store (defaults to philadelphiamusic)
- `tools:stop` — `docker compose stop`
- `tools:clean` — `docker compose down --volumes`

**`lib/tasks/stores.rake`** — Per-store admin operations (all take a positional `[username]` argument):
- `stores:sync[username]` — Full Discogs sync
- `stores:sync:quick[username]` — Quick sync (1 page)
- `stores:enrich[username]` — Enrich releases
- `stores:curate[username]` — Run daily curation
- `stores:stats[username]` — Print store stats
- `stores:score[username,listing_id]` — Score breakdown
- `stores:reset_surfacing[username]` — Reset surfacing data
- `stores:add[username]` — Onboard a new store

### R-6: Deprecation path

The old top-level tasks in `milkcrate.rake` (`sync`, `enrich`, `curate`, `setup`, `stats`, `score`, `reset_surfacing`, `normalize_usernames`) print a deprecation warning directing to the new task and continue to work. They are removed after a transition period.

### R-7: Data loading runs without network

`tools:load` must work with zero network access. All data comes from the committed JSONL file. No Discogs API calls, no external services.

## Key Decisions

1. **Static JSONL committed to the repo** — follows the `find` project's `solr/solrjson_*.jsonl` pattern. Generate once, load on demand.
2. **JSONL over YAML** — compact, fast to stream-parse, and you already know the pattern from find.
3. **`tools:*` namespace for dev lifecycle** — parallels find's `tools:start` / `tools:stop` / `tools:clean` pattern. The name says what it does without repeating the project name.
4. **`stores:*` namespace for store operations** — parallel naming scheme, flat and unambiguous. Tasks always require an explicit store username.
5. **`find_or_create_by!` for idempotent loads** — simpler than upsert, and since the snapshot is static, there's nothing to update on re-run.
6. **`--force` flag (not env var)** — follows Rails convention for rake task flags.
7. **The sample dataset *is* the dev data source** — philadelphiamusic is a production reference store used to *generate* the sample, not to develop against directly.

## Scope Boundaries

- **Not changing experiment.rake** — it references `demo_store` too, but that's a separate concern.
- **Not removing `Settings.demo_store` yet** — the marketing preview presenter and other code still reference it. Can clean up separately.
- **Not adding CI integration** — the JSONL is committed and `tools:load` can be run manually in CI if needed, but that's not in scope.
- **Not generating test fixtures** — this is for dev browsing, not specs.

## Open Questions

- What happens to `Settings.demo_store` in the long term? Could be renamed to `Settings.reference_store` or `Settings.capture_store` for the few places that still need a default.
- Should `tools:start` also run the optional dev setup steps (like seeding waitlist records, creating placeholder data)? Can be added later.
- Version field in the JSONL schema for future snapshot migrations? Probably overkill for now.
