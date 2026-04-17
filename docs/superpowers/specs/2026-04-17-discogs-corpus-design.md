# Discogs Corpus Snapshot Design

## Goal

Create a realistic, reproducible listing corpus that can be seeded into development and test databases without repeatedly calling the Discogs API after database resets.

## Scope

In scope:

- A git-committed JSON snapshot containing Discogs-derived store and listing metadata (no binary assets).
- A manual refresh workflow that rewrites that snapshot from Discogs API responses.
- A seed workflow that imports the snapshot into `Store` and `Listing` tables idempotently.
- Basic corpus stats/reporting for visibility into size and composition.
- Automated tests for importer behavior and task-level execution.
- README workflow documentation.

Out of scope:

- Automatic scheduled refresh.
- Storing images/audio/zip assets.
- Replacing existing online sync behavior for production.

## Design Principles

- Realism over tiny synthetic fixtures: data should reflect real store inventory shape for algorithm tuning.
- Deterministic output: refresh should produce stable JSON ordering for reviewable diffs.
- Idempotent import: repeated seeding should not duplicate records.
- Minimal coupling: corpus tooling should layer onto existing services and model schema.
- Explicit operator control: refresh happens only on manual command.

## High-Level Architecture

### Files and responsibilities

- `db/corpus/discogs_store_snapshot.json`
  - Canonical committed corpus snapshot.
  - Contains top-level snapshot metadata plus one store and its listings.

- `app/services/corpus/discogs_snapshot_exporter.rb`
  - Pulls inventory pages from Discogs for a given username.
  - Normalizes records to the snapshot JSON shape.
  - Applies deterministic ordering and writes pretty JSON.

- `app/services/corpus/discogs_snapshot_importer.rb`
  - Reads snapshot JSON.
  - Upserts store and listings using existing model constraints.
  - Returns import summary (stores/listings inserted/updated/skipped).

- `lib/tasks/corpus.rake`
  - Defines `corpus:seed`, `corpus:refresh`, and `corpus:stats` tasks.

- `spec/services/corpus/discogs_snapshot_importer_spec.rb`
  - Verifies mapping/idempotency and required field handling.

- `spec/tasks/corpus_rake_spec.rb`
  - Verifies task invocation behavior and output expectations.

- `README.md`
  - Documents local workflow and command usage.

### Runtime flows

Refresh flow (`corpus:refresh`):

1. Load username and optional page cap from task args.
2. Fetch inventory pages through `DiscogsClient`.
3. Keep only fields needed by app logic and UI.
4. Sort listings deterministically.
5. Write JSON snapshot to `db/corpus/discogs_store_snapshot.json`.
6. Print summary stats.

Seed flow (`corpus:seed`):

1. Read snapshot JSON.
2. Upsert store by `discogs_username`.
3. Upsert listings by `discogs_listing_id` (same uniqueness key used in sync path).
4. Update store counters/timestamps.
5. Print import summary.

Stats flow (`corpus:stats`):

1. Parse snapshot JSON.
2. Report listing count, unique genres/styles, date span, and file size.

## Snapshot JSON Contract

Path:

- `db/corpus/discogs_store_snapshot.json`

Top-level structure:

```json
{
  "snapshot_version": 1,
  "captured_at": "2026-04-17T16:30:00Z",
  "source": {
    "discogs_username": "philadelphiamusic",
    "max_pages": 20,
    "per_page": 100
  },
  "store": {
    "name": "Philadelphia Music",
    "discogs_username": "philadelphiamusic",
    "description": "..."
  },
  "listings": [
    {
      "discogs_listing_id": "1234567890",
      "discogs_release_id": "987654",
      "artist": "Artist Name",
      "title": "Album Title",
      "label": "Label",
      "year": 1978,
      "format": "Vinyl, LP",
      "genres": ["Electronic"],
      "styles": ["Ambient"],
      "condition": "VG+",
      "price": "14.99",
      "currency": "USD",
      "thumbnail_url": "https://...",
      "cover_image_url": "https://...",
      "notes": "...",
      "listed_at": "2026-03-22T18:12:01Z"
    }
  ]
}
```

Notes:

- URL fields remain plain strings only; images are not downloaded.
- `listings` must be sorted by `discogs_listing_id` ascending for deterministic diffs.
- Arrays (`genres`, `styles`) should be stable and compacted (no `nil`).

## Detailed Behavior

### Exporter (`corpus:refresh` backend)

- Inputs:
  - Required `username` argument.
  - Optional `max_pages` argument (default set in task to avoid surprise API volume).
- Uses the existing `DiscogsClient` to request inventory pages.
- Applies same vinyl filtering rule as sync path (`Listing::VINYL_FORMATS`).
- Transforms each listing into the snapshot contract.
- Sorts and writes JSON with stable key order and pretty indentation.
- Fails fast on API errors with a clear message.

### Importer (`corpus:seed` backend)

- Reads snapshot and validates required keys (`store`, `listings`).
- Ensures target store exists via `find_or_initialize_by(discogs_username:)`.
- Upserts listings using `Listing.upsert_all` or per-record upsert keyed by `discogs_listing_id`.
- Sets `store_id` for all imported listings.
- Updates store-level fields (`last_synced_at`, `total_listings`, `sync_status`) to an idle seeded state.
- Idempotency guarantee: running seed repeatedly yields same record count and no duplicates.

### Rake tasks

- `corpus:refresh[username,max_pages]`
  - Example: `bin/rails "corpus:refresh[philadelphiamusic,20]"`
  - Rewrites `db/corpus/discogs_store_snapshot.json`.

- `corpus:seed`
  - Example: `bin/rails corpus:seed`
  - Imports snapshot into current environment DB.

- `corpus:stats`
  - Example: `bin/rails corpus:stats`
  - Prints size and composition stats.

## Environment Behavior

- Development:
  - Default setup path can call `corpus:seed` after `db:prepare` to bootstrap realistic local data quickly.

- Test:
  - Test suite can use importer directly for corpus-backed integration specs where realistic inventory shape is beneficial.
  - No external API calls required for these tests.

## Error Handling

- Missing snapshot file: `corpus:seed` exits with actionable guidance to run refresh or pull latest.
- Invalid JSON/schema mismatch: explicit parser/validation error includes missing keys.
- API failure during refresh: task raises and leaves existing snapshot untouched.
- Empty API result: task writes valid empty-listings snapshot and prints warning.

## Security and Compliance

- Snapshot contains public marketplace metadata only.
- No secrets or access tokens are written to file.
- Task output must not print token values.

## Testing Strategy

### Service specs

- Importer maps JSON fields to model attributes correctly.
- Importer is idempotent across repeated runs.
- Importer handles missing optional fields safely (`notes`, `styles`, `year`).

### Task specs/smoke

- `corpus:seed` imports expected counts from fixture.
- `corpus:stats` prints expected headings and counts.
- `corpus:refresh` command path is covered with client stubs (no live API in tests).

### Regression safety

- Existing picks selector spec should run against seeded data without API dependency.

## Operational Workflow

Recommended operator sequence:

1. Refresh snapshot intentionally:
   - `bin/rails "corpus:refresh[<discogs_username>,<max_pages>]"`
2. Review diff in snapshot JSON.
3. Run `bin/rails corpus:stats` and spot-check composition.
4. Commit snapshot + code changes together.
5. Seed local DB any time with `bin/rails corpus:seed`.

## Open Decisions Resolved

- Storage format: committed JSON fixture (not zip, not SQL dump).
- Refresh cadence: manual only.
- Primary optimization target: realistic algorithm behavior.

## Success Criteria

- Developer can rebuild DB and reseed realistic listings without Discogs API calls.
- Seed operation is deterministic and idempotent.
- Snapshot refresh is explicit, reviewable, and easy to run.
- Picks algorithm work can proceed against stable corpus data in dev and test.
