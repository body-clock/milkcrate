---
title: "feat: Admin Dashboard Information Architecture Overhaul"
type: feat
status: active
date: 2026-06-12
origin: docs/ideation/2026-06-12-admin-dashboard-ia-filtering-ideation.md
---

# feat: Admin Dashboard Information Architecture Overhaul

## Summary

Transform the admin dashboard from a flat chronological store grid into an operational control surface with health-state sorting, interactive filtering, collapsible sections, elapsed-time display, per-store actions, search, and expandable cards — sequenced so each layer builds on the previous.

---

## Problem Frame

The admin dashboard currently renders all stores in a flat grid sorted by `created_at: :desc`. With 10-50 stores, the operator must scroll past every healthy card to find the ones needing attention. The header metrics (Healthy/Processing/Attention counts) are decorative — not clickable. There is no filtering, sorting, search, or action surface. The operator's primary question — "which stores need my attention right now?" — is not answered by the current layout. This plan implements the 7 surviving ideas from the ideation at `docs/ideation/2026-06-12-admin-dashboard-ia-filtering-ideation.md`.

---

## Requirements

- R1. Stores must be sorted by health severity (failed → stale → partial → processing → healthy) instead of `created_at: :desc`
- R2. The operator must be able to filter stores by health state using the existing DashboardMetrics counts as interactive toggles
- R3. The operator must be able to search stores by name or Discogs username (client-side)
- R4. Stores must be grouped under collapsible health-state section headers with count badges
- R5. Processing stores must display elapsed time since status change (e.g., "Syncing for 12 min")
- R6. Each store card must offer context-aware actions: resync (for failed/stale), view storefront (for all)
- R7. Store cards must expand to reveal full health reasons, error details, and action buttons
- R8. Healthy stores must collapse to a single summary line by default, surfacing attention-needed stores as the primary view

---

## Scope Boundaries

- No new database migrations — all data exists in current schema
- No new design system components — compose from existing primitives (Card, Button, Badge, SectionHeader)
- No store detail page (`/admin/stores/:id`) — deferred to follow-up
- No batch actions ("Retry all failed") — builds on per-store action menu, Phase 2
- No applicant workflow changes — noted as deliberate gap in ideation
- No historical health data or trend indicators — requires schema changes
- No error classification or auto-retry — premature without error history data

### Deferred to Follow-Up Work

- Store detail page with sync history, action buttons, and error timeline: natural follow-up after action menu exists
- Batch "Sync All Stale" and "Retry All Failed" actions: builds on per-store action menu and section headers
- Applicant bulk-onboard workflow: separate concern, better as focused improvement
- Stale-duration indicators and catalog coverage sparklines: polish ideas, lower priority than structural changes

---

## Context & Research

### Relevant Code and Patterns

- **Presenter chain:** `Admin::DashboardPresenter` → `Admin::StoreHealthPresenter` → `Admin::StoreHealth` — all props flow through this pipeline
- **Health model:** `StoreHealth` service computes `key` (failed/stale/partial/processing/healthy) and `severity` (danger/warning/working/good) from store enums
- **Store enums:** `sync_status` (idle/syncing/failed), `enrichment_status` (idle/enriching/failed), `catalog_coverage` (unknown/near_complete/partial)
- **Existing onboarding pattern:** `Admin::OnboardingsController#create` — POST action that finds a Waitlist, calls `StoreOnboarding.call`, redirects. The retry action follows this same pattern.
- **SectionHeader:** has an `action` slot (currently unused) — ideal for section-level controls
- **DashboardMetrics:** computes `healthyCount`, `attentionCount`, `processingCount` by filtering on `health.key` — same logic reused for filter toggles
- **useResync hook:** polls every 3s when stores are syncing/enriching — elapsed-time display benefits from this auto-refresh
- **Test patterns:** `admin_dashboard.test.tsx` uses vitest + testing-library, renders with `renderWithTier`, provides full `AdminDashboardProps` fixture

### Institutional Learnings

- Admin dashboard was built in two phases (May 2026): workflow + discogs onboarding. Both fully shipped.
- Prior ideation ranked attention-first sort as #2 overall. "Red-First Dashboard" was rejected as too opinionated but noted as "better as a dashboard filter option" — this plan implements exactly that.
- The `SectionHeader` `action` slot was designed for future use but never populated — this plan uses it for section-level batch actions in follow-up work.

---

## Key Technical Decisions

- **Severity sort is server-side, not client-side.** The presenter reorders `active_stores` by health severity weight. This ensures the sort is correct on initial load without client-side reordering logic. The frontend receives pre-sorted data.
- **Filter state lives in Dashboard (dashboard.tsx), lifted above both DashboardHeader and DashboardPanels.** DashboardMetrics currently lives inside DashboardHeader, which is a sibling of DashboardPanels — neither can pass state to the other. Filter state is managed in `dashboard.tsx` and threaded down to both DashboardMetrics (for toggle UI) and DashboardPanels (for filtered grid). This requires modifying `dashboard.tsx` and `dashboard_header.tsx` to accept and forward filter state.
- **Sections are derived from sorted array, not separate queries.** Grouping stores by `health.key` is a trivial transformation of the already-sorted array. No new backend endpoint or separate data fetch needed. Failed, stale, and partial are grouped under a single "Attention" section — this is a business simplification (all three signal "needs operator review") rather than one section per health key.
- **Elapsed-time uses client-side calculation from existing timestamps.** `Date.now() - new Date(lastStatusChangeAt)` with the `useResync` hook keeping it current. **Known limitation:** `last_synced_at` is only written when sync completes, so during an active sync the elapsed time reflects time since the *previous* completed sync, not when the current sync started. No existing field tracks `processing_started_at`. This is acceptable for v1 — the elapsed time still provides useful context ("this store has been syncing for a while") even if the exact start time is approximate. A `processing_started_at` column can be added in a follow-up for precision.
- **Action menu uses Inertia router for server-side job enqueue.** The retry action POSTs to a new controller endpoint that enqueues `FullStoreSyncJob.perform_later(store.id)` (the job expects a numeric store ID, not a Store instance). This follows the existing onboarding pattern (POST → redirect).
- **Expandable cards use local React state, not URL state.** Expand/collapse is per-card UI state, not a shareable view. This avoids URL clutter while keeping the interaction fast.

---

## Open Questions

### Resolved During Planning

- **Sort order within severity bands:** Within "failed" stores, sort by `last_sync_error_at` descending (most recently failed first). Within "healthy" stores, sort by `last_synced_at` ascending (most overdue first). This ensures the most urgent store in each band appears first.
- **Filter toggle interaction model:** Multi-select (multiple health states can be active simultaneously). "All" clears filters. Active state indicated by filled badge variant. No URL persistence in v1 — can be added later.
- **Elapsed-time thresholds:** Sync > 30 min = yellow escalation. Enrichment > 10 min = yellow escalation. Thresholds are hardcoded constants, not configurable.
- **Action menu scope:** v1 includes "Resync now" (for failed/stale/processing stores) and "View storefront" (for all stores). "Re-enrich" and "Re-curate" deferred to follow-up.
- **Expand trigger:** Click the card header or a chevron icon. Not the entire card (would conflict with other click targets).

### Deferred to Implementation

- Exact elapsed-time formatting (relative time library vs manual formatting)
- Animation approach for expand/collapse transition
- Confirmation dialog for resync action (simple confirm() vs custom modal)

---

## Implementation Units

### U1. Backend: Sort Stores by Health Severity

**Goal:** Reorder the `active_stores` array so stores needing attention appear first, replacing the current `created_at: :desc` sort.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `app/presenters/admin/dashboard_presenter.rb`
- Modify: `app/presenters/admin/store_health_presenter.rb`
- Test: `spec/presenters/admin/dashboard_presenter_spec.rb`

**Approach:**
- Add a `severity_weight` method to `StoreHealthPresenter` that maps `health.key` to a numeric weight: failed=0, stale=1, partial=2, processing=3, healthy=4
- In `DashboardPresenter#active_stores`, map stores through `StoreHealthPresenter`, sort by severity_weight ascending, then extract the props
- Within each severity band, secondary sort by recency: for failed stores, `last_sync_error_at` desc; for others, `last_synced_at` asc (most overdue first)
- The presenter now returns pre-sorted props — no frontend sort needed

**Patterns to follow:**
- `DashboardPresenter` pattern of mapping through presenters and calling `.props`
- `StoreHealth` priority chain pattern (first match wins) for severity weighting

**Test scenarios:**
- Happy path: 5 stores with mixed health states return in severity order (failed → stale → partial → processing → healthy)
- Edge case: All stores healthy — sort by `last_synced_at` ascending (most overdue first)
- Edge case: No stores — returns empty array
- Edge case: Stores with nil `last_synced_at` sort before non-nil (never synced is most urgent)
- Integration: Presenter output matches expected order for a realistic mix of store states

**Verification:**
- `DashboardPresenter.new.props[:active_stores]` returns stores in health-severity order
- Existing admin dashboard test continues to pass (order change is not a breaking behavior)

---

### U2. Backend: Add Store Retry Endpoint

**Goal:** Add a POST endpoint that enqueues `FullStoreSyncJob` for a specific store, enabling the per-store action menu.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Create: `app/controllers/admin/stores_controller.rb` (new controller)
- Modify: `config/routes.rb`
- Test: `spec/requests/admin/stores_spec.rb`

**Approach:**
- Create `Admin::StoresController` with a `retry_sync` action (POST `/admin/stores/:id/retry`)
- Action finds the store by ID, enqueues `FullStoreSyncJob.perform_later(store.id)` (job expects numeric ID, not instance), redirects to `admin_path` with a notice
- Follow the existing `Admin::OnboardingsController` pattern: find → validate → enqueue → redirect
- No frontend changes in this unit — the action menu that calls this endpoint is built in U6

**Patterns to follow:**
- `Admin::OnboardingsController#create` — find, validate, enqueue, redirect pattern
- `Admin::BaseController` — inherits auth and layout

**Test scenarios:**
- Happy path: POST to `/admin/stores/:id/retry` enqueues `FullStoreSyncJob` with `store.id` and redirects with notice
- Error path: POST with nonexistent store ID redirects with alert
- Integration: `FullStoreSyncJob` is enqueued exactly once with the correct numeric store ID

**Verification:**
- `FullStoreSyncJob` job count increases by 1 after POST
- Redirect goes to admin dashboard with success notice

---

### U3. Frontend: Filter State Infrastructure + Clickable Metrics

**Goal:** Lift filter state to `dashboard.tsx` and make DashboardMetrics counts interactive toggle buttons that control which stores appear in the grid.

**Requirements:** R2

**Dependencies:** U1 (stores should be pre-sorted for filters to be meaningful)

**Files:**
- Modify: `app/frontend/pages/admin/dashboard.tsx`
- Modify: `app/frontend/pages/admin/dashboard/dashboard_header.tsx`
- Modify: `app/frontend/pages/admin/dashboard/dashboard_metrics.tsx`
- Modify: `app/frontend/pages/admin/dashboard/dashboard_panels.tsx`
- Modify: `app/frontend/pages/admin/dashboard/store_grid.tsx`
- Test: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- Add `healthFilter` state to `dashboard.tsx` (array of active health keys, empty = show all)
- Thread `healthFilter` and `setHealthFilter` down through `DashboardHeader` → `DashboardMetrics` (for toggle UI) and through `DashboardPanels` → `StoreGrid` (for filtering)
- Convert `DashboardMetrics` from static `<dl>` to clickable buttons: each metric tile has an `onClick` that toggles its health key in `healthFilter`
- Active filters shown with filled badge variant; inactive with outline/ghost variant
- "All" button appears when any filter is active, clears all filters
- Filter state is local React state in dashboard.tsx (no URL persistence in v1)
- **Note:** This unit modifies `dashboard.tsx` and `dashboard_header.tsx` to thread filter state through the component tree — DashboardMetrics lives in DashboardHeader, which is a sibling of DashboardPanels, so state must be lifted to their common parent.

**Patterns to follow:**
- `DashboardMetrics` existing layout and `Badge` variant system for active/inactive visual treatment
- `SectionHeader` action slot pattern for the "Clear filters" control

**Test scenarios:**
- Happy path: Click "Attention" metric → store grid shows only failed/stale/partial stores
- Happy path: Click "Healthy" metric → store grid shows only healthy stores
- Edge case: Click multiple metrics → union of selected health states shown
- Edge case: Click "All" or deselect all → all stores shown
- Edge case: No stores match filter → empty state shown
- Integration: Filtered count in metrics updates to reflect filtered view

**Verification:**
- Clicking each metric tile filters the store grid to matching health states
- Multiple selections produce a union filter
- Clearing filters restores full grid

---

### U4. Frontend: Search by Store Name or @Username

**Goal:** Add a text search input that filters stores by name or Discogs username in real-time.

**Requirements:** R3

**Dependencies:** U3 (shares the filtering infrastructure in DashboardPanels)

**Files:**
- Modify: `app/frontend/pages/admin/dashboard/dashboard_panels.tsx`
- Modify: `app/frontend/pages/admin/dashboard/store_grid.tsx`
- Test: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- Add `searchQuery` state to `DashboardPanels`
- Apply search filter after health filter: `stores.filter(s => matchesSearch(s, query))`
- Search matches against `name` and `discogs_username` (case-insensitive substring match)
- Search input rendered between metrics and grid, visible when 5+ stores exist
- Debounce input by 150ms to avoid filtering on every keystroke
- Search and health filters compose: "Attention + search 'brooklyn'" = failed/stale/partial stores matching "brooklyn"

**Patterns to follow:**
- Existing `Field` / input patterns in the design system
- Standard React `useEffect` + `useState` debounce pattern (setTimeout with cleanup)

**Test scenarios:**
- Happy path: Type "healthy" → only stores with "healthy" in name/username shown
- Happy path: Type "@vinyl" → stores matching username shown
- Edge case: Empty search → all stores shown (health filter still applies)
- Edge case: No matches → empty state shown
- Edge case: Combined with health filter → intersection of both filters
- Edge case: Case-insensitive → "BROOKLYN" matches "brooklyn"

**Verification:**
- Search input filters stores in real-time (with debounce)
- Search composes with health filter toggles
- Search input hidden when ≤4 stores

---

### U5. Frontend: Collapsible Health-State Sections

**Goal:** Group stores under collapsible section headers: "Attention (3)" expanded, "Processing (2)" expanded, "Healthy (7)" collapsed by default.

**Requirements:** R4, R8

**Dependencies:** U1 (stores must be pre-sorted by severity for grouping to work), U3 (filters affect which sections appear)

**Files:**
- Modify: `app/frontend/pages/admin/dashboard/store_grid.tsx`
- Create: `app/frontend/pages/admin/dashboard/health_section.tsx`
- Test: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- After health + search filtering, group consecutive stores by `health.key`
- Render each group under a `HealthSection` component with a `SectionHeader` (count badge in action slot)
- Section headers: "Attention (N)" for failed+stale+partial, "Processing (N)" for processing, "Healthy (N)" for healthy
- Collapsible: Attention and Processing sections expanded by default, Healthy collapsed
- Collapsed sections show count badge and chevron; click to expand
- When health filter is active, only matching sections appear (e.g., filter="failed" → only "Attention" section with failed stores)
- "View all stores" toggle at top when Healthy section is collapsed (expands all sections)

**Patterns to follow:**
- `SectionHeader` component with `action` slot for count badge
- `EmptyState` component for sections with 0 stores after filtering

**Test scenarios:**
- Happy path: 3 failed + 2 healthy stores → "Attention (3)" expanded, "Healthy (2)" collapsed
- Happy path: Click "Healthy" section header → section expands, stores visible
- Edge case: All stores healthy → "Healthy (10)" section shown, expanded (no attention section)
- Edge case: Health filter active → only matching sections shown
- Edge case: Search + filter → sections reflect intersection
- Edge case: 0 stores after filtering → empty state shown

**Verification:**
- Stores grouped under correct health-state sections
- Healthy section collapsed by default; Attention/Processing expanded
- Sections collapsible with count badges
- Filtered views show only matching sections

---

### U6. Frontend: Elapsed-Time Display on Processing Cards

**Goal:** Show "Syncing for 12 min" on processing store cards, with severity escalation when duration exceeds thresholds.

**Requirements:** R5

**Dependencies:** None (independent of filtering/sections)

**Files:**
- Modify: `app/frontend/pages/admin/dashboard/store_card/store_health_metrics.tsx`
- Create: `app/frontend/pages/admin/dashboard/store_card/elapsed_time.tsx`
- Test: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- Create `ElapsedTime` component that computes `Date.now() - new Date(statusChangedAt)` and renders relative time
- Display below the health badge on processing cards: "Syncing for 12 min" or "Enriching for 5 min"
- Severity escalation: yellow text at >30 min for sync, >10 min for enrichment; red at >60 min / >30 min
- Use `useResync` hook's existing 3s polling to keep elapsed time current
- For "processing" stores missing readiness (waiting on first run), show "Waiting for first sync" instead of elapsed time

**Patterns to follow:**
- `formatTime` utility in `store_health_metrics.tsx` for date formatting
- `Badge` variant system (working/warning/danger) for color escalation
- `useResync` hook for auto-refresh

**Test scenarios:**
- Happy path: Processing store with `last_synced_at` 5 min ago → "Syncing for 5 min"
- Happy path: Processing store with `last_enriched_at` 45 min ago → "Enriching for 45 min" (yellow)
- Edge case: Store that synced 2 hours ago and is currently re-syncing — elapsed shows time since last completion (known limitation for v1, see Key Technical Decisions)
- Edge case: Store waiting on first sync (nil `last_synced_at`) → "Waiting for first sync"
- Edge case: Store at exactly threshold → yellow escalation
- Edge case: Healthy/failed stores → no elapsed time shown

**Verification:**
- Processing stores display elapsed time that updates with polling
- Color escalation triggers at defined thresholds
- Non-processing stores unaffected

---

### U7. Frontend: Per-Store Action Menu + Expandable Cards

**Goal:** Add a dropdown action menu to each store card with context-aware actions, and make cards expandable to reveal full health reasons and error details.

**Requirements:** R6, R7

**Dependencies:** U2 (retry endpoint must exist for "Resync now" action), U6 (elapsed time shown in expanded view)

**Files:**
- Modify: `app/frontend/pages/admin/dashboard/store_card/index.tsx`
- Create: `app/frontend/pages/admin/dashboard/store_card/action_menu.tsx`
- Create: `app/frontend/pages/admin/dashboard/store_card/expanded_details.tsx`
- Test: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- **Action menu:** Dropdown button in card header (next to health badge). Menu items:
  - "Resync now" — visible when `health.key` is failed, stale, or processing. POSTs to `/admin/stores/:id/retry` via Inertia router.
  - "View storefront" — always visible. Links to `store.storefront_path`.
  - Chevron/expand toggle — always visible. Toggles expanded state.
- **Expandable card:** Click chevron or expand toggle to reveal `ExpandedDetails` component:
  - Full `health.reasons` array (currently only `reasons[0]` shown)
  - Full `last_sync_error_summary` with `last_sync_error_at` timestamp
  - Elapsed time for processing stores (reuses U6's `ElapsedTime` component)
  - Action buttons: "Resync now" (larger, primary variant) and "View storefront" (secondary)
- Collapsed view remains compact: name, health badge, health bar summary
- Expand/collapse animated with CSS transition (height: auto)

**Patterns to follow:**
- `DiscogsOnboardingPanel` pattern for Inertia form submission
- `FeedbackMessage` component for error display
- `Button` component variants (primary/secondary) for action buttons

**Test scenarios:**
- Happy path: Click kebab menu on failed store → "Resync now" and "View storefront" visible
- Happy path: Click "Resync now" → POST to retry endpoint, store enters "processing" state
- Happy path: Click expand toggle → card expands showing full reasons, error detail, action buttons
- Happy path: Click "View storefront" → navigates to storefront URL
- Edge case: Healthy store → "Resync now" not in menu (only "View storefront" and expand)
- Edge case: Processing store → "Resync now" visible but disabled (already syncing)
- Edge case: Store with no error → expanded view shows health reasons but no error detail
- Edge case: Click expand on already-expanded card → collapses

**Verification:**
- Action menu appears with correct items per health state
- "Resync now" triggers server-side job enqueue
- Card expands/collapses smoothly revealing full details
- Expanded view shows complete health reasons and error information

---

## System-Wide Impact

- **Interaction graph:** `DashboardPanels` gains filter state that flows to `StoreGrid` → `HealthSection` → `StoreCard` → `ActionMenu`/`ExpandedDetails`. The Inertia entry point (`dashboard.tsx`) passes `active_stores` unchanged; filtering happens downstream.
- **Error propagation:** The retry endpoint (`U2`) follows the existing onboarding pattern: find → enqueue → redirect. Failures redirect with alert message, same as onboarding.
- **State lifecycle risks:** Filter state is local React state — no persistence, no race conditions. The `useResync` hook's polling only reloads `active_stores`, not filter state. Expand/collapse state is per-card local state, reset on full page reload.
- **API surface parity:** The retry endpoint is new and admin-only. No public API surface change.
- **Integration coverage:** The filter → sort → section → expand chain needs integration testing: verify that filtering, sorting, and section grouping compose correctly when multiple filters are active.
- **Unchanged invariants:** `Admin::DashboardPresenter.props` shape is unchanged (same keys, same types). Existing Inertia page props contract preserved. `StoreHealth` service logic unchanged. No model changes.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Severity sort changes card order on existing dashboard | Expected behavior — the sort is the core improvement. Existing tests may need order assertions updated. |
| Filter state in DashboardPanels adds complexity to component tree | State is local and composable. Keep filter logic in one component, pass filtered arrays down. |
| Elapsed-time calculation drifts if polling stops | `useResync` already handles polling lifecycle. Elapsed time gracefully degrades to last-known value. |
| Action menu adds click targets that may conflict with card expand | Use distinct click targets: kebab icon for menu, chevron icon for expand. No overlap. |
| Section grouping changes visual layout significantly | Healthy section collapsed by default softens the change. "View all stores" toggle provides escape hatch. |

---

## Sources & References

- **Origin document:** `docs/ideation/2026-06-12-admin-dashboard-ia-filtering-ideation.md`
- **Prior admin ideation:** `docs/ideation/2026-05-15-admin-ui-sync-enrichment-onboarding-ideation.md`
- **Prior admin workflow plan:** `docs/plans/2026-05-16-001-feat-admin-dashboard-workflow-plan.md`
- **StoreHealth service:** `app/services/admin/store_health.rb`
- **DashboardPresenter:** `app/presenters/admin/dashboard_presenter.rb`
- **StoreHealthPresenter:** `app/presenters/admin/store_health_presenter.rb`
- **Dashboard page:** `app/frontend/pages/admin/dashboard.tsx`
- **Existing tests:** `app/frontend/test/pages/admin_dashboard.test.tsx`
