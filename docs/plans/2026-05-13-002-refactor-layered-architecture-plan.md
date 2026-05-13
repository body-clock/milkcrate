---
title: Resolve layered-architecture violations across the codebase
type: refactor
status: active
date: 2026-05-13
origin: docs/brainstorms/layered-architecture-fixes-requirements.md
---

# Resolve Layered-Architecture Violations

## Summary

Fix all findings from the layered-architecture audit by: consolidating enrichment jobs into a single `EnrichmentService` called from one thin `EnrichmentJob`, extracting `DailyCurationJob` domain logic into a service, removing dead code and layer violations, moving misplaced abstractions to their correct layers, and cleaning up orphaned database tables.

---

## Problem Frame

The codebase was audited against layered-architecture principles (presentation → application → domain → infrastructure) and several violations were found. Jobs contain domain and infrastructure logic inline, a domain model calls an application-layer service, presentation formatting lives in a domain model, a policy object sits in the wrong directory, a service checks `Rails.env` directly, and duplicate state-management code exists across model and service layers. These increase carrying cost, make testing harder, and violate abstraction boundaries that will compound as the codebase grows.

---

<!-- Origin doc: docs/brainstorms/layered-architecture-fixes-requirements.md -->

## Requirements

- R1. Consolidate `EnrichReleasesJob` + `EnrichMusicBrainzImagesJob` into a single `EnrichmentService` with two public methods: `#enrich_releases(store, listing_ids:)` and `#enrich_music_brainz_images(store)`
- R2. Create a single `EnrichmentJob` as a thin wrapper; remove the two old jobs
- R3. `FullStoreSyncJob` enqueues the single `EnrichmentJob` instead of the two old jobs
- R4. Release enrichment chain is preserved (image enrichment still runs after release enrichment)
- R5. Extract domain logic from `DailyCurationJob` into a service; job becomes a thin wrapper
- R6. The extracted service handles surfaced-listing computation and `last_surfaced_at`/`surface_count` updates
- R7. Remove `StoreSync::StateManager`; route callers to `Store#mark_sync_succeeded!` and `Store#mark_sync_failed!`
- R8. Remove `DailySelection.fetch_or_generate` (dead code — no production callers)
- R9. Move `PickPolicy` from `app/models/` to `app/services/`
- R10. Move `display_price` and `discogs_url` from `Listing` model to `CratePresenter`
- R11. Remove `display_price` and `discogs_url` from `Listing`
- R12. Replace `Rails.env.development?` check in `StorefrontCuration` with injected `filter_available:` parameter
- R13. Remove unused `StorefrontTheme#crate_for` method
**Origin acceptance examples:** AE1 (enrichment consolidation produces identical outcome), AE2 (daily curation extraction preserves behavior), AE3 (display methods removed from Listing, available via presenter), AE4 (injected filter_available eliminates Rails.env branch), AE5 (sync failure behavior preserved after StateManager removal)

---

## Scope Boundaries

- No new features or user-facing behavior changes
- No frontend / Inertia.js changes
- No extraction of `DailySelectionService` scoring domain logic to share with `RecordScorer`
- No changes to `DiscogsClient` or `MusicBrainzClient` API client layer
- No performance optimization beyond what refactoring naturally brings

### Deferred to Follow-Up Work

- Adding automated architecture enforcement tools (packwerk, rubocop-rspec, custom CI checks)

---

## Context & Research

### Relevant Code and Patterns

- **Existing service pattern:** `StoreSync` module in `app/services/store_sync/` with sub-classes (`InventoryFetcher`, `ListingNormalizer`, etc.) — established pattern for building a service with internal sub-operations
- **Existing job→service pattern:** `FullStoreSyncJob` delegates to `StoreSyncService`, keeps error handling + orchestration — the model for thin wrapper jobs
- **Existing presenter:** `CratePresenter` in `app/presenters/crate_presenter.rb` serializes listings via `listing_props` — the natural home for `display_price` and `discogs_url`
- **Spec organization:** Tests live in `spec/models/`, `spec/services/`, `spec/jobs/`, `spec/presenters/` matching the app structure

### Institutional Learnings

- No relevant learnings in `docs/solutions/` for this refactoring topic

### External References

- Not required — the codebase has strong local patterns for service objects, thin jobs, and presenters

---

## Key Technical Decisions

- **Single enrichment job → single service with two methods**: The enrichment pipeline is already chained (`EnrichReleasesJob` calls `EnrichMusicBrainzImagesJob` at the end). Merging into one service called from one job is simpler than two thin wrappers.
- **Remove StateManager, keep model methods**: `Store#mark_sync_succeeded!` and `Store#mark_sync_failed!` already exist. Removing the service-side duplication keeps state-transition logic on the model.
- **`PickPolicy` → `app/services/`**: No `app/policies/` directory exists, and there's no framework dependency like `action_policy` that would make a `policies/` convention meaningful. `app/services/` is the pragmatic home.
- **All changes land together**: Each change is small and independent. A single PR avoids context-switching between multiple refactoring PRs.

---

## Open Questions

### Deferred to Implementation

- [Affects R1–R4][Technical] Does `EnrichmentService#enrich_releases` call `#enrich_music_brainz_images` synchronously or enqueue a follow-up? (Origin deferred this to planning — resolve during implementation based on whether rate limiting benefits from sequential execution.)
- [Affects R5][Technical] What should the `DailyCurationService` be named? Default: `app/services/daily_curation_service.rb`.

---

## Implementation Units

### U1. Remove dead code (DailySelection, StorefrontTheme)

**Goal:** Eliminate dead code to reduce noise before active refactors — remove unused model methods and unused storefront logic.

**Requirements:** R8, R13

**Dependencies:** None

**Files:**
- Modify: `app/models/daily_selection.rb`
- Modify: `app/models/storefront_theme.rb`
- Modify: `spec/models/daily_selection_spec.rb`

**Approach:**
1. Remove `DailySelection.fetch_or_generate` class method and `DailySelectionService` reference. Keep `DailySelection.on` (used by `DailySelectionService`).
2. Remove the `crate_for` method and `FEATURED_CRATE_SIZE` constant from `StorefrontTheme` (ensure no callers elsewhere first).
3. Update the `daily_selection_spec.rb` — remove the `fetch_or_generate` describe block. Keep existing specs for `.on`.
4. Verify that `dig_sessions` and `dig_session_items` tables are already dropped (migration `20260430182926_drop_dig_sessions.rb`).

**Test scenarios:**
- **Happy path:** `DailySelection` responds to `.on` but not `.fetch_or_generate`
- **Edge case:** `StorefrontTheme` still works for `.style`, `.genre`, `eligible?`, and `listings_for` — only `crate_for` is removed

**Verification:**
- `grep -rn "fetch_or_generate" app/` returns nothing
- `grep -rn "crate_for\|FEATURED_CRATE_SIZE" app/` returns only legitimate new references if any
- `DailySelection` specs pass
- `StorefrontTheme` specs pass (existing, no changes needed)

---

### U2. Move PickPolicy to app/services/

**Goal:** Relocate a policy object from the domain layer (`app/models/`) to the application layer where it belongs.

**Requirements:** R9

**Dependencies:** None (can run in parallel with U1)

**Files:**
- Create: `app/services/pick_policy.rb` (same content as existing)
- Delete: `app/models/pick_policy.rb`
- Move: `spec/models/pick_policy_spec.rb` → `spec/services/pick_policy_spec.rb` (update describe)

**Approach:**
1. Create `app/services/pick_policy.rb` with the same content as the existing model file.
2. Delete `app/models/pick_policy.rb`.
3. Move spec file and update the `RSpec.describe` path.
4. Rails autoloading handles the rest — both `app/models/` and `app/services/` are in the default autoload paths, so no `require` changes needed.

**Test scenarios:**
- **Happy path:** `CrateStrategies::Picks` loads and uses `PickPolicy` correctly
- **Edge case:** Rails autoloading resolves `PickPolicy` from `app/services/` without errors

**Verification:**
- All existing specs for `PickPolicy` and `CrateStrategies::Picks` pass
- `rails runner "PickPolicy.new.genre_cap(12)"` works without autoload errors

---

### U3. Move display_price and discogs_url to CratePresenter

**Goal:** Remove presentation-layer concerns from the `Listing` domain model — `display_price` formats a price string, `discogs_url` constructs a URL. Both belong in the presenter.

**Requirements:** R10, R11

**Dependencies:** None (can run in parallel with U1/U2)

**Important invariant:** Three frontend TypeScript components reference `listing.discogs_url` (`crate_view.tsx`, `record_card.tsx`, `pile_sheet.tsx`). The presenter must continue to emit `discogs_url` (and `display_price`) as hash keys in `listing_props` — frontend components will break silently if the key is removed or renamed.

**Files:**
- Modify: `app/models/listing.rb`
- Modify: `app/presenters/crate_presenter.rb`
- Modify: `spec/models/listing_spec.rb`
- Modify: `spec/presenters/crate_presenter_spec.rb`

**Approach:**
1. Add `format_price` and `listing_discogs_url` private methods (or inline the logic) to `CratePresenter#listing_props`. Include `display_price` and `discogs_url` in the returned hash instead of serializing `price` raw.
2. Remove `display_price` and `discogs_url` from `Listing`.
3. Update the presenter spec to verify `display_price` and `discogs_url` in `listing_props` output.
4. Update listing model spec to remove tests for the deleted methods.
5. The presenter already emits `discogs_url` via `listing.discogs_url` — ensure the inline replacement preserves the same hash keys.

**Patterns to follow:**
- `CratePresenter#listing_props` already serializes listing fields — this is extending the existing pattern, not inventing a new one

**Test scenarios:**
- **Happy path:** `CratePresenter#listing_props` includes `display_price` (formatted) and `discogs_url` for a listing with a price
- **Edge case:** `display_price` returns `"—"` when `listing.price` is nil
- **Edge case:** `discogs_url` returns correct URL for a listing with a `discogs_listing_id`
- **Error path:** `Listing#display_price` and `Listing#discogs_url` raise `NoMethodError` (R11)
- Covers AE3.

**Verification:**
- All listing/presenter specs pass
- `grep -rn "\.display_price\|\.discogs_url" app/` returns only presenter references

---

### U4. Inject filter_available parameter in StorefrontCuration

**Goal:** Remove the `Rails.env.development?` check from the application-layer service by injecting the decision as a constructor parameter.

**Requirements:** R12

**Dependencies:** None (can run in parallel with U1/U2/U3)

**Files:**
- Modify: `app/services/storefront_curation.rb`
- Modify: `app/controllers/stores_controller.rb`
- Modify: `spec/services/storefront_curation_spec.rb`

**Approach:**
1. Add `filter_available:` keyword parameter to `StorefrontCuration#initialize`, defaulting to `true` (preserving existing behavior for all callers except development).
2. Update `eligible_listings` to use `@filter_available` instead of `Rails.env.development?`.
3. In `StoresController#render_store`, pass `filter_available: !Rails.env.development?` (or `false` in development).
4. Update the existing spec to test both `filter_available: true` and `filter_available: false`.

**Patterns to follow:**
- This follows the existing `initialize(store)` pattern — just adding a keyword arg

**Test scenarios:**
- **Happy path:** `StorefrontCuration.new(store, filter_available: true)` applies `available` scope — same behavior as before
- **Happy path:** `StorefrontCuration.new(store, filter_available: false)` skips the `available` scope
- **Edge case:** Default is `filter_available: true` — existing callers without the arg continue to work
- Covers AE4.

**Verification:**
- All storefront curation specs pass
- Storefront renders correctly in both development and production modes

---

### U5. Consolidate StateManager into Store model

**Goal:** Remove `StoreSync::StateManager` and route all callers to the existing `Store` model methods that already do the same thing.

**Requirements:** R7

**Dependencies:** None (can run in parallel with U1–U4)

**Files:**
- Delete: `app/services/store_sync/state_manager.rb`
- Modify: `app/services/store_sync_service.rb` (replace `StoreSync::StateManager.start!` / `.succeed!` / `.fail!` with `Store` methods)
- Modify: `app/jobs/full_store_sync_job.rb` (any remaining `StateManager` references)
- Modify: `spec/services/store_sync/state_manager_spec.rb` (remove or repurpose)
- Modify: `spec/services/store_sync_service_spec.rb`

**Approach:**
1. Check exact method signatures of `Store#mark_sync_succeeded!` and `Store#mark_sync_failed!` against how `StateManager.succeed!/fail!/start!` are called.
2. In `StoreSyncService`, replace:
   - `StoreSync::StateManager.start!(@store)` → `@store.update!(sync_status: "syncing")`
   - `StoreSync::StateManager.succeed!(@store, ...)` → `@store.mark_sync_succeeded!(...)`
   - `StoreSync::StateManager.fail!(@store, e)` → `@store.mark_sync_failed!(e)`
3. In `FullStoreSyncJob`, any remaining `StateManager` references get the same treatment.
4. Remove `state_manager.rb` and its spec file (or repurpose spec to test the model methods instead).

**Test scenarios:**
- **Happy path:** A successful sync calls `Store#mark_sync_succeeded!` with correct attributes
- **Happy path:** A failed sync calls `Store#mark_sync_failed!` with the error
- **Integration:** End-to-end store sync sets correct sync_status transitions (syncing → idle on success, syncing → failed on error)
- Covers AE5.

**Verification:**
- `grep -rn "StateManager" app/` returns nothing
- `StoreSyncService` and `FullStoreSyncJob` specs pass
- Store sync works correctly end-to-end

---

### U6. Extract DailyCurationJob logic into a service

**Goal:** Move domain-level data mutation (computing surfaced listings, updating `last_surfaced_at`/`surface_count`) out of the job and into a service object. The job becomes a thin wrapper.

**Requirements:** R5, R6

**Dependencies:** None (but conceptually builds on the pattern from U5 — this is the second service extraction)

**Files:**
- Create: `app/services/daily_curation_service.rb`
- Modify: `app/jobs/daily_curation_job.rb`
- Modify: `spec/services/daily_curation_service_spec.rb` (create)
- Modify: `spec/jobs/daily_curation_job_spec.rb`

**Approach:**
1. Create `DailyCurationService` with a `curate(store)` method that takes a store and does: instantiate `StorefrontCuration`, compute `surfaced_listings` and `picks_count`, update `Listing` records via `update_all`, and log.
2. Thin job wrapper: `DailyCurationJob#perform(store_id)` calls `DailyCurationService.new.curate(store)`.
3. Move the service spec to `spec/services/` — test the service directly instead of through the job.
4. The job spec tests only that the job enqueues/calls the service correctly (mock the service).

**Patterns to follow:**
- `FullStoreSyncJob` → `StoreSyncService` pattern: job is thin, service has the logic
- Similar structure to `DailySelectionService`

**Test scenarios:**
- **Happy path:** `DailyCurationService#curate(store)` surfaces listings via `StorefrontCuration` and updates `last_surfaced_at` + increments `surface_count`
- **Edge case:** Store with no eligible listings — service handles gracefully (no crash, logs appropriately)
- **Integration:** `DailyCurationJob` calls the service with the correct store
- **Job isolation:** Job spec mocks the service and verifies it's called

**Verification:**
- All curation specs pass (both job and service tests)
- Running the service for a test store produces the same listing updates as before

---

### U7. Consolidate enrichment into EnrichmentService + single EnrichmentJob

**Goal:** Merge `EnrichReleasesJob` and `EnrichMusicBrainzImagesJob` into one `EnrichmentService` with two methods, called from a single thin `EnrichmentJob`. Remove both old jobs.

**Requirements:** R1, R2, R3, R4

**Dependencies:** None (conceptually builds on U5/U6 patterns but has no code dependency on them)

**Files:**
- Create: `app/services/enrichment_service.rb`
- Create: `app/jobs/enrichment_job.rb`
- Delete: `app/jobs/enrich_releases_job.rb`
- Delete: `app/jobs/enrich_music_brainz_images_job.rb`
- Modify: `app/jobs/full_store_sync_job.rb` (enqueue `EnrichmentJob` instead of `EnrichReleasesJob`)
- Create: `spec/services/enrichment_service_spec.rb`
- Create: `spec/jobs/enrichment_job_spec.rb`
- Delete: `spec/jobs/enrich_releases_job_spec.rb`
- Delete: `spec/jobs/enrich_music_brainz_images_job_spec.rb`
- Modify: `spec/jobs/full_store_sync_job_spec.rb`

**Approach:**
1. Create `EnrichmentService` with two public methods:
   - `#enrich_releases(store, listing_ids: nil)` — contains all logic from `EnrichReleasesJob` (Discogs API calls, data extraction, `Release.upsert`, `Listing.update_all`, rate limiting). Returns nothing (self-contained).
   - `#enrich_music_brainz_images(store)` — contains all logic from `EnrichMusicBrainzImagesJob` (MusicBrainz search, cover art fetching, DB updates, rate limiting).
2. Deferred decision: `#enrich_releases` can call `#enrich_music_brainz_images` at the end (synchronous, preserving sequence), or `EnrichmentJob` can call both methods sequentially. Resolve during implementation based on whether synchronous sequencing is acceptable or async separation is preferred.
3. `EnrichmentJob` is a thin wrapper: `def perform(store_id)` → `service = EnrichmentService.new; store = Store.find(store_id); service.enrich_releases(store); service.enrich_music_brainz_images(store)`.
4. Update `FullStoreSyncJob` to enqueue `EnrichmentJob` instead of `EnrichReleasesJob`.
5. Remove old job files and their specs.
6. Write a comprehensive service spec that tests:
   - Release enrichment (Discogs data → Release upsert + Listing update)
   - MusicBrainz image enrichment (MBID lookup → cover image update)
   - Rate limit handling (retries, sleeps)
   - Error handling (API errors logged, not raised)

**Patterns to follow:**
- `StoreSyncService` pattern for service with multiple internal operations
- `FullStoreSyncJob` pattern for thin job wrapper with error handling

**Test scenarios:**
- **Happy path:** `#enrich_releases` enriches releases from Discogs data, creates/updates `Release` records, updates `Listing` records with genres/styles/want/have/cover
- **Happy path:** `#enrich_music_brainz_images` finds MBIDs for releases without cover images, fetches cover art, updates listings
- **Edge case:** Rate limit low — service pauses before continuing
- **Edge case:** Rate limit hit — retries after sleep
- **Edge case:** API error for a single release — logged, not raised, other releases continue
- **Edge case:** No stale releases — service exits early without API calls
- **Integration:** `EnrichmentJob` calls both service methods
- Covers AE1.

**Verification:**
- All enrichment specs pass
- `grep -rn "EnrichReleasesJob\|EnrichMusicBrainzImagesJob" app/` returns nothing (except possibly migration references)
- `FullStoreSyncJob` spec verifies it enqueues `EnrichmentJob`
- Running enrichment for a test store produces identical data to the old two-job pipeline

---

## System-Wide Impact

- **Interaction graph:** `FullStoreSyncJob` enqueues `EnrichmentJob` instead of `EnrichReleasesJob`. No other jobs changed.
- **Error propagation:** `FullStoreSyncJob`'s `rescue` block catches errors from `EnrichmentJob` as it did with `EnrichReleasesJob` — no change to the error boundary.
- **State lifecycle risks:** The `EnrichmentJob` runs asynchronously after `FullStoreSyncJob` finishes, same as before. No new partial-write risks.
- **Unchanged invariants:** All external APIs (Discogs, MusicBrainz, Turnstile) unchanged. All database schema unchanged (except dropping orphaned tables). All controllers unchanged (except StorefrontCuration initialization in U4). All frontend unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `EnrichmentService` introduces a regression in rate-limit handling | Carry forward the exact rate-limit logic from the old jobs; test with mocked API responses |
| Removing `StateManager` breaks a subtle attribute merge difference | Compare `StateManager.succeed!` with `Store#mark_sync_succeeded!` side-by-side during implementation; verify the merge behavior is preserved |
| `StorefrontTheme#crate_for` has a non-obvious caller | `grep -rn "crate_for\|\.crate_for" app/` before removing |
| `DigSession` tables are referenced by a migration or rake task | Check for references before dropping — `spec/tasks/` has `milkcrate_add_store_spec.rb` and `milkcrate_score_spec.rb` |
| `EnrichReleasesJob` spec has coverage for edge cases the new service might miss | Carry all test scenarios forward; don't lose coverage during consolidation |

---

## Documentation / Operational Notes

- Verify `dig_sessions` and `dig_session_items` tables are already dropped (migration `20260430182926_drop_dig_sessions.rb`)

---

## Sources & References

- **Origin document:** `docs/brainstorms/layered-architecture-fixes-requirements.md`
- Related audit conversation (current session)
