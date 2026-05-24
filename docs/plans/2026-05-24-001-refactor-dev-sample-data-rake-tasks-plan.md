---
title: "Dev sample data with reorganized rake tasks"
type: refactor
status: active
date: 2026-05-24
origin: docs/brainstorms/dev-sample-data-requirements.md
---

# Dev Sample Data with Reorganized Rake Tasks

## Summary

Replace the monolithic `milkcrate.rake` with two focused rake files — `tools.rake` for dev environment lifecycle (Docker postgres management, sample data load/capture) and `stores.rake` for per-store admin operations (sync, enrich, curate) that always require an explicit store username. Add a JSONL sample data snapshot at `db/sample/listings.jsonl` so that local development loads ~1,000 realistic records in seconds instead of waiting for a full Discogs sync.

---

## Problem Frame

Local development currently relies on syncing `philadelphiamusic` (90k records) via the Discogs API, then running enrichment and curation jobs. A full iteration cycle takes minutes. The existing rake tasks (`sync`, `enrich`, `curate`) sound generic but all hardcode `Settings.demo_store` — misleading now that the app onboards real stores. The rake structure needs to be honest about what it does, and the dev data pipeline needs to be fast enough for sub-second iteration.

---

## Requirements

- R1. A JSONL snapshot of ~1,000 real Discogs listings is committed to the repo at `db/sample/listings.jsonl`
- R2. `tools:load` reads the JSONL and populates the database idempotently (default) or clean-slate (`FORCE=true`)
- R3. `tools:capture` generates a fresh JSONL from a synced real store
- R4. `tools:start` handles full dev bootstrap: docker compose up, db:create, db:migrate, tools:load
- R5. `tools:stop` and `tools:clean` stop and destroy Docker services
- R6. `stores:*` tasks take an explicit `[username]` argument, never a default
- R7. Old `milkcrate.rake` tasks print deprecation warnings pointing to the new tasks

---

## Scope Boundaries

- Not modifying `experiment.rake` (separate cleanup pass, still references `demo_store`)
- Not removing `Settings.demo_store` from config (still used by marketing preview presenter)
- Not adding CI integration or test fixtures
- Not changing StoreSyncService, enrichment pipeline, or curation logic

---

## Context & Research

### Relevant Code and Patterns

- **Existing `lib/tasks/milkcrate.rake`** — source of all tasks to be migrated. Uses `demo_store` helper to resolve `Settings.demo_store.discogs_username`. Each task is self-contained with `:environment` dependency.
- **`lib/tasks/experiment.rake`** — follows the same `demo_store` pattern (left untouched).
- **`app/services/store_sync/listing_normalizer.rb`** — Discogs API response normalizer. Not directly reused but documents the listing attribute shape.
- **`config/settings.yml`** — `demo_store` key with `discogs_username: philadelphiamusic`.
- **`docker-compose.yml`** — Postgres 16 on port 5433 with health check.

### Institutional Learnings

- No relevant learnings for seed data or rake organization in `docs/solutions/`.

---

## Key Technical Decisions

- **JSONL format** over YAML — compact, fast to stream-parse, matches the `find` project pattern the user referenced. One JSON object per line with keys `store`, `store_owner`, `release`, `listing`.
- **ENV var for force mode** — `FORCE=true bin/rails tools:load`. Rake doesn't support native CLI flags; ENV vars are idiomatic for Rails rake tasks.
- **`find_or_create_by!` for idempotent loads** — simpler than upsert. Since the snapshot is static, there's nothing to update on re-run.
- **Positional `[username]` args for stores tasks** — matches the existing `milkcrate:score[id]` and `milkcrate:add_store[username]` conventions.
- **`Rake::Task[...].invoke` for chaining** — `tools:start` chains db:create and db:migrate via Rake invocation rather than shelling out to `bin/rails`.
- **No capture overwrite guard** — `tools:capture` always overwrites `db/sample/listings.jsonl`. The file is committed separately; capture is a maintainer action.

---

## Implementation Units

### U1. Create `lib/tasks/tools.rake` — Dev lifecycle

**Goal:** Provide `tools:start`, `tools:stop`, `tools:clean`, `tools:load`, `tools:capture` for the full Docker + data bootstrap cycle.

**Requirements:** R2, R3, R4, R5

**Dependencies:** None (new file)

**Files:**
- Create: `lib/tasks/tools.rake`

**Approach:**

```ruby
namespace :tools do
  # ── Dev lifecycle ────────────────

  desc "Start services, create/migrate DB, load sample data"
  task start: :environment do
    # 1. docker compose up -d
    # 2. Wait for postgres health check
    # 3. Rake::Task['db:create'].invoke
    # 4. Rake::Task['db:migrate'].invoke
    # 5. Rake::Task['tools:load'].invoke
  end

  desc "Stop Docker services"
  task :stop do
    system("docker compose stop")
  end

  desc "Stop and remove Docker volumes (destroys all data)"
  task :clean do
    system("docker compose down --volumes")
  end

  # ── Sample data ─────────────────

  desc "Load sample data from db/sample/listings.jsonl"
  task load: :environment do
    file = Rails.root.join("db/sample/listings.jsonl")
    raise "Sample data file not found at #{file}" unless file.exist?

    if ENV["FORCE"]
      # delete_all in dependency order
    end

    # Read JSONL line by line, find_or_create_by! each record
    # Report counts
  end

  desc "Capture sample data from a synced store"
  task capture: :environment do
    store_username = ENV["STORE_USERNAME"] || Settings.demo_store.discogs_username
    # Query 1000 most recent available LP listings with eager-loaded releases
    # Serialize to JSONL at db/sample/listings.jsonl
  end
end
```

**Key details for `tools:load`:**
- Dependency-safe delete order for `--force` mode: `Listing.delete_all`, `Release.delete_all`, `Store.delete_all`, `StoreOwner.delete_all`
- Each JSONL line has `store`, `store_owner`, `release`, `listing` keys
- Resolve store by `discogs_username`, release by `discogs_release_id`, listing by `discogs_listing_id`
- Skip `created_at`, `updated_at`, `store_id`, `id` from listing attributes (Rails sets these on create)
- Use `Listing#attributes.slice(...)` and `.except("id", "store_id", "created_at", "updated_at")` for serialization
- Report: "Loaded N listings, M releases, S stores (force=#{!!ENV['FORCE']})"

**Key details for `tools:capture`:**
- Resolve store by `ENV['STORE_USERNAME']` or `Settings.demo_store.discogs_username`
- Query: `store.listings.available.lp_only.includes(:release).order(listed_at: :desc).limit(1000)`
- For each listing, serialize store, store_owner, release, and listing attributes
- Write one JSON line per listing using `JSON.generate` (not `to_json` — avoid including AR metadata)
- Overwrite `db/sample/listings.jsonl` atomically (write to temp, rename)

**Key details for `tools:start`:**
- `system("docker compose up -d")` — start services
- Wait loop with `pg_isready` via docker exec (or check container health)
- Invoke `Rake::Task['db:create'].invoke` and `Rake::Task['db:migrate'].invoke`
- Invoke `Rake::Task['tools:load'].invoke`
- Print: "All set! Run bin/dev to start the dev server."

**Patterns to follow:**
- Existing `lib/tasks/milkcrate.rake` for rake task structure (namespace, `desc`, `:environment` dependency)
- Existing `lib/tasks/experiment.rake` for `system()` calls

**Test scenarios:**
- Test expectation: none — these are environment/tooling tasks. Manual verification by running each task against a clean environment.

**Verification:**
- `bin/rails tools:start` brings up docker postgres, creates and migrates the database, loads 1000 sample records
- `bin/rails tools:load` can be re-run idempotently
- `FORCE=true bin/rails tools:load` wipes and reloads
- `bin/rails tools:stop` stops docker without removing volumes
- `bin/rails tools:clean` destroys volumes
- `bin/rails tools:capture` writes a valid JSONL to `db/sample/`

---

### U2. Create `lib/tasks/stores.rake` — Per-store operations

**Goal:** Provide `stores:sync[username]`, `stores:enrich[username]`, `stores:curate[username]`, `stores:stats[username]`, `stores:score[username,listing_id]`, `stores:reset_surfacing[username]`, `stores:add[username]` — all requiring an explicit store identifier.

**Requirements:** R6

**Dependencies:** None (new file)

**Files:**
- Create: `lib/tasks/stores.rake`

**Approach:**

```ruby
namespace :stores do
  def find_store(username)
    store = Store.find_by(discogs_username: username.downcase)
    raise "Store not found: #{username}" unless store
    store
  end

  desc "Full inventory sync from Discogs — stores:sync[username]"
  task :sync, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])
    service = StoreSyncService.new(store)
    # sync ONLY — no enrichment or curation chained
  end

  desc "Enrich releases for a store — stores:enrich[username]"
  task :enrich, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])
    EnrichmentJob.perform_now(store.id)
  end

  desc "Run daily curation for a store — stores:curate[username]"
  task :curate, [ :username ] => :environment do |_, args|
    store = find_store(args[:username])
    DailyCurationJob.perform_now(store.id)
  end
end
```

**Key decisions:**
- Each task is **purely atomic** — does exactly what its name says and nothing else. No chaining across tasks.
  - `stores:sync` → syncs inventory only. No enrichment or curation.
  - `stores:enrich` → enriches releases only.
  - `stores:curate` → runs curation only.
- No `run_follow_up_jobs` helper — the old pattern of bundling sync+enrich+curate is eliminated entirely.
- No `sync:quick` — obsoleted by the JSONL sample data. Devs use `tools:load` instead.
- Each task is a `task :name, [ :username ] => :environment` with a positional arg
- `find_store` helper replaces the old `demo_store` helper
- For `stores:score`, add a second `:listing_id` arg: `task :score, [ :username, :listing_id ]`
- `stores:add` takes `[ :username ]` and calls `StoreOnboarding.call`
- All task bodies stay the same as their `milkcrate.rake` counterparts, just replacing `demo_store` with `find_store(args[:username])` and removing any chaining to other operations

**Patterns to follow:**
- Existing task bodies from `lib/tasks/milkcrate.rake` for sync, enrich, curate, stats, score, reset_surfacing, add_store logic

**Test scenarios:**
- Test expectation: none — these are admin/tooling tasks. Manual testing by running against a known store.

**Verification:**
- `bin/rails 'stores:sync[philadelphiamusic]'` syncs and reports success (no enrichment or curation triggered)
- `bin/rails 'stores:enrich[philadelphiamusic]'` enriches only
- `bin/rails 'stores:curate[philadelphiamusic]'` curates only
- `bin/rails 'stores:stats[philadelphiamusic]'` prints stats
- `bin/rails 'stores:add[tiny_records]'` onboards a new store
- Omitting the username argument produces a clear usage error

---

### U3. Deprecate old `lib/tasks/milkcrate.rake` tasks

**Goal:** Add deprecation warnings to each old-style task pointing to the new namespace, without breaking existing behavior immediately.

**Requirements:** R7

**Dependencies:** U1, U2 (the new tasks must exist before users can be directed to them)

**Files:**
- Modify: `lib/tasks/milkcrate.rake`

**Approach:**
- For each task in the `milkcrate` namespace (sync, sync:quick, enrich, curate, setup, reset_surfacing, score, stats), add a deprecation message at the top of the task body
- Keep the existing behavior working (the task still executes)
- Remove `normalize_usernames` entirely (one-time data fix, no longer needed)
- Keep `add_store` — it's already correctly general

Example wrapper pattern:
```ruby
task sync: :environment do
  puts "DEPRECATED: use 'stores:sync[username]' instead. This task will be removed."
  store = demo_store
  # ... rest of existing logic
end
```

**Tasks to deprecate:**
- `sync` → `stores:sync[username]` (note: old sync also queued enrich+curate; new sync is atomic)
- `sync:quick` → removed entirely (obsoleted by JSONL sample data — use `tools:load` instead)
- `enrich` → `stores:enrich[username]`
- `curate` → `stores:curate[username]`
- `setup` → `tools:start` (old setup bundled sync+enrich+curate — new dev path uses JSONL)
- `reset_surfacing` → `stores:reset_surfacing[username]`
- `stats` → `stores:stats[username]`
- `score` → `stores:score[username,listing_id]`

**Patterns to follow:**
- Keep `demo_store` helper in place (the deprecated tasks still reference it)
- Remove `run_follow_up_jobs` helper entirely — it was only used by the bundled sync tasks

**Test scenarios:**
- Test expectation: none — manual verification that each old task prints a warning and still works.

**Verification:**
- `bin/rails milkcrate:sync` prints deprecation warning then executes
- `bin/rails milkcrate:normalize_usernames` is no longer available

---

### U4. Capture and commit sample data

**Goal:** Generate the initial `db/sample/listings.jsonl` from a synced philadelphiamusic database and commit it to the repo.

**Requirements:** R1

**Dependencies:** U1 (the `tools:capture` task must exist)

**Files:**
- Create: `db/sample/listings.jsonl` (generated artifact)

**Approach:**
1. Ensure philadelphiamusic has been synced and enriched (run `bin/rails 'stores:sync[philadelphiamusic]'` then `bin/rails 'stores:enrich[philadelphiamusic]'`)
2. Run `bin/rails tools:capture` to generate `db/sample/listings.jsonl`
3. Verify the file: check line count (~1000), parse a few lines to confirm valid JSON, check genre diversity
4. Commit the file: `git add db/sample/listings.jsonl && git commit -m "feat: add dev sample data snapshot"`

**Test scenarios:**
- Test expectation: none — one-time manual capture. Validated by file inspection.

**Verification:**
- `db/sample/listings.jsonl` has ~1000 lines of valid JSON
- Each line contains `store`, `store_owner`, `release`, and `listing` keys
- `wc -l db/sample/listings.jsonl` returns ~1000

---

## System-Wide Impact

- **`lib/tasks/milkcrate.rake`** — deprecated but not removed. All old tasks continue to work with a warning.
- **`lib/tasks/experiment.rake`** — not touched. Still uses `demo_store` helper. Will need a separate cleanup pass.
- **`app/presenters/marketing_preview_presenter.rb`** — not touched. Still uses `Settings.demo_store`.
- **`config/settings.yml`** — not changed. `demo_store` key still present for capture default and marketing preview.
- No models, controllers, views, services, or jobs are changed.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Existing dev workflows break if old tasks are removed too fast | Tasks stay functional with deprecation warnings for a transition period |
| `tools:start` assumes Docker is installed and running | System call will fail with a clear error message if `docker compose` is not available |
| JSONL file grows stale and diverges from real Discogs data | Periodic re-capture is a manual `tools:capture` invocation. Acceptable for dev work |
| New devs run old `milkcrate:setup` and get confused by deprecation | The warning directs them to `tools:start`. The docstring on the new tasks is clearer |

---

## Sources & References

- **Origin document:** [docs/brainstorms/dev-sample-data-requirements.md](/Users/pperkins/code/p/milkcrate/docs/brainstorms/dev-sample-data-requirements.md)
- Related code: `lib/tasks/milkcrate.rake`, `app/services/store_sync/listing_normalizer.rb`
- External reference: `find` project's `lib/tasks/tools.rake` for the tooling pattern
