---
title: fix: Keep onboarding spinner until sync and enrichment are complete
type: fix
status: completed
date: 2026-05-15
---

# fix: Keep onboarding spinner until sync and enrichment are complete

## Summary

Add an `enrichment_status` field to `Store` (mirroring the existing `sync_status` pattern) so the frontend spinner persists until both the Discogs inventory sync and the release metadata/image enrichment are fully done.

---

## Problem Frame

The store onboarding flow runs a two-pass sync (`FullStoreSyncJob`) then enqueues `EnrichmentJob` and `DailyCurationJob` asynchronously. The frontend currently shows a loading spinner only when `sync_status === "syncing"`. Once the sync finishes, `sync_status` flips back to `"idle"` and the spinner disappears — even though enrichment (Discogs release metadata + MusicBrainz cover images) is still running in the background.

Because `StorefrontCuration` rebuilds crates on every page request from the current state of listings, refreshing during the enrichment window produces unstable results: genre crates shift as genres populate, and listings lack cover images. The user sees a storefront that is partially built and changing between refreshes rather than waiting for the store to be fully ready.

---

## Requirements

- R1. The loading spinner persists until both the inventory sync and the enrichment process are complete
- R2. The spinner appears only when enrichment is actively running (`enrichment_status === "enriching"`); a store where enrichment was never enqueued does not spinner indefinitely — it renders normally
- R3. If enrichment fails, the store recovers gracefully — the spinner is released and the storefront renders with whatever data is available (same behavior as a failed sync today)

---

## Scope Boundaries

- Keeping `DailyCurationJob` enqueued in parallel with `EnrichmentJob` — the spinner wall makes job ordering unnecessary for this fix
- Caching or once-a-day request-time curation (separate optimization)
- Changing the Discogs or MusicBrainz API interaction logic
- Modifying the "Sync failed" alert or the "No vinyl found yet" empty state

---

## Context & Research

### Relevant Code and Patterns

- `Store` model (`app/models/store.rb`): existing `sync_status` enum (`idle`, `syncing`, `failed`) sets the pattern to follow
- `StoreSyncService` (`app/services/store_sync_service.rb`): manages `sync_status` lifecycle during sync
- `FullStoreSyncJob` (`app/jobs/full_store_sync_job.rb`): orchestrates sync → enrich → curate pipeline
- `EnrichmentJob` (`app/jobs/enrichment_job.rb`): currently has no status-tracking — calls `EnrichmentService` with no Store updates
- `CratePresenter#store_props` (`app/presenters/crate_presenter.rb`): serializes store fields to the frontend; currently passes `sync_status` and `last_sync_error_at`
- `Featured` page (`app/frontend/pages/stores/featured.tsx`): renders spinner when `sync_status === "syncing"`, renders crates otherwise
- `Store` type (`app/frontend/types/inertia.ts`): `sync_status: string` field to extend
- Migration pattern: `db/migrate/20260505221500_add_sync_error_tracking_to_stores.rb` — `add_column` style

### Existing sync_status flow

```
idle → syncing (StoreSyncService#sync sets this) → idle (mark_sync_succeeded!)
                                                → failed (mark_sync_failed!)
```

The plan mirrors this exactly for enrichment: `idle → enriching → idle|failed`.

---

## Key Technical Decisions

- **Separate `enrichment_status` field rather than combining into a single "ready" check**: follows the existing `sync_status` pattern, gives independent observability into each pipeline stage, and avoids changing the sync lifecycle
- **Use `"idle"` as the default for both new and existing stores**: the frontend shows the spinner only when `enrichment_status === "enriching"` — no timestamp check is needed. `EnrichmentJob` flips the status to `"enriching"` immediately before work begins, so the frontend never needs to guess whether enrichment was enqueued
- **Set `enrichment_status: "enriching"` at job start, not at enqueue time**: same as how `sync_status: "syncing"` works — avoids a window where the job is queued but not picked up and the store looks like it's enriching
- **Frontend check: show spinner when `sync_status === "syncing"` OR `enrichment_status === "enriching"`**: minimal change, preserves existing rendering branches

---

## Implementation Units

### U1. Add `enrichment_status` to Store model

**Goal:** Add the database column, model enum, and serialization to give enrich jobs a place to report their status.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Create: `db/migrate/YYYYMMDDHHMMSS_add_enrichment_status_to_stores.rb`
- Modify: `app/models/store.rb`
- Modify: `app/presenters/crate_presenter.rb`
- Modify: `app/frontend/types/inertia.ts`
- Modify: `spec/presenters/crate_presenter_spec.rb`
- Modify: `spec/factories/stores.rb`

**Approach:**
- Add `enrichment_status` column to `stores` (string, default `"idle"`, not null) and `last_enriched_at` (datetime, null) via migration
- Add `enrichment_status` enum to `Store` model: `idle`, `enriching`, `failed` — mirroring `sync_status`
- Add `enrichment_status` and `last_enriched_at` to `CratePresenter#store_props` hash
- Add default `enrichment_status { "idle" }` to the store factory

**Patterns to follow:**
- `app/models/store.rb` — existing `sync_status` enum definition
- `db/migrate/20260505221500_add_sync_error_tracking_to_stores.rb` — column addition style
- `spec/presenters/crate_presenter_spec.rb:77` — existing `store_props` expectation pattern

**Test scenarios:**
- Happy path: `CratePresenter#store_props` includes `enrichment_status` with the store's current value
- Edge case: new store defaults to `enrichment_status: "idle"`
- Edge case: `enrichment_status` enum validates `"enriching"` and `"failed"` values

**Verification:**
- Migration runs cleanly; store factory creates stores with default enrichment_status; `CratePresenter#store_props` includes the new field

---

### U2. Update EnrichmentJob to manage enrichment status

**Goal:** `EnrichmentJob` sets `enrichment_status` to `"enriching"` on start and resets to `"idle"` on success or `"failed"` on error, matching the `sync_status` lifecycle pattern.

**Requirements:** R1, R2, R3

**Dependencies:** U1

**Files:**
- Modify: `app/jobs/enrichment_job.rb`
- Modify: `spec/jobs/enrichment_job_spec.rb`

**Approach:**
- At the top of `#perform`: `store.update!(enrichment_status: "enriching")`
- After both enrichment methods complete: `store.update!(enrichment_status: "idle")`
- On hard failure (StandardError): `store&.update!(enrichment_status: "failed")` and re-raise, matching the existing `store&.mark_sync_failed!` safe-navigation pattern in `FullStoreSyncJob`. SolidQueue will retry; the failed status helps observability between retries.
- Add `last_enriched_at: Time.current` to the success update (backend observability, matching the existing `last_synced_at` pattern)
- Error boundary: `EnrichmentService` handles per-record API errors internally (rescuing `ApiError` / `RateLimitError` without raising), so the job only sees `"failed"` for hard infrastructure failures (DB errors, connection failures). Individual API errors within enrichment do not set `"failed"` — the store is considered enriched even if some releases had API errors.

**Execution note:** Write failing specs first — enrichment status transitions are the behavior under test.

**Patterns to follow:**
- `app/services/store_sync_service.rb` — how `sync_status` transitions are managed (`update!(sync_status: "syncing")` at start, `mark_sync_succeeded!` / `mark_sync_failed!` at end)
- `spec/jobs/full_store_sync_job_spec.rb` — job spec pattern with `allow(EnrichmentService)` test doubles

**Test scenarios:**
- Happy path: job sets `enrichment_status` to `"enriching"` at start, then `"idle"` on completion
- Happy path: `last_enriched_at` is set on successful completion
- Happy path: `enrichment_status` is `"idle"` after completion regardless of individual API errors within `EnrichmentService`
- Error path: hard failure (StandardError raised in service) sets `enrichment_status` to `"failed"`, then re-raises
- Integration: enrichment completed successfully, then the store's `enrichment_status` is `"idle"`

**Verification:**
- Specs pass; `EnrichmentJob` lifecycle matches `FullStoreSyncJob` status management pattern

---

### U3. Extend frontend spinner to cover enrichment

**Goal:** The frontend shows the loading spinner until both `sync_status !== "syncing"` AND `enrichment_status` is no longer in-flight (not `"enriching"` and not never-run).

**Requirements:** R1, R2

**Dependencies:** U1, U2

**Files:**
- Modify: `app/frontend/pages/stores/featured.tsx`
- Modify: `app/frontend/types/inertia.ts`

**Approach:**
- Add `enrichment_status` and `last_enriched_at` to the `Store` interface in `inertia.ts`
- Change the spinner condition from `sync_status === "syncing"` to `sync_status === "syncing" || enrichment_status === "enriching"`
- Update the spinner copy to be stage-appropriate — when only enrichment is running (sync already complete), the text should reflect that (e.g., "Setting up your store…") rather than saying "Syncing inventory…"
- R2 handling: a store where enrichment was never enqueued has `enrichment_status: "idle"` and `last_enriched_at: null` — but the spinner does NOT show for this case, because the condition only triggers on `"enriching"`. This avoids infinite spinners for stores created without enrichment.

**Patterns to follow:**
- `app/frontend/pages/stores/featured.tsx:79` — existing spinner conditional

**Test scenarios:**
- Happy path: `sync_status: "syncing"` + `enrichment_status: "idle"` → spinner shown
- Happy path: `sync_status: "idle"` + `enrichment_status: "enriching"` → spinner shown
- Happy path: `sync_status: "idle"` + `enrichment_status: "idle"` → spinner hidden, storefront renders
- Edge case: `sync_status: "failed"` + `enrichment_status: "enriching"` → spinner shown (enrichment still in flight, don't show stale storefront)
- Edge case: `sync_status: "idle"` + `enrichment_status: "failed"` → spinner hidden, storefront renders (match existing failed-sync recovery behavior)

**Verification:**
- Manual: onboard a test store, confirm spinner stays visible through the full sync + enrich pipeline, then storefront appears fully populated with images and stable genre crates
- TypeScript compiles without errors in the Featured page and type definitions

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Enrichment job fails indefinitely → spinner never releases | `enrichment_status` set to `"failed"` on error (U2); frontend treats `"failed"` same as `"idle"` for spinner visibility (U3:R3) |
| Stores created without enrichment enqueued show spinner forever | Spinner condition only triggers on `"enriching"`; stores where enrichment was never enqueued remain `"idle"` and render normally |
| Brief gap between sync completing and enrichment starting — both statuses `"idle"`, storefront briefly visible with unenriched data | SolidQueue pickup latency makes this window negligible in practice. If it becomes measurable, `FullStoreSyncJob` can set `enrichment_status: "enriching"` at enqueue time rather than deferring to job start. |

---

## Sources & References

- Related code: `app/models/store.rb`, `app/jobs/enrichment_job.rb`, `app/jobs/full_store_sync_job.rb`, `app/frontend/pages/stores/featured.tsx`
- Related plan: `docs/superpowers/plans/2026-05-05-full-inventory-sync-and-image-enrichment.md` — original sync + enrichment design
- Institutional learnings: `docs/solutions/` (no directly applicable past learnings for enrichment status tracking)
