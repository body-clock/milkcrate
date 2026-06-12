---
date: 2026-06-12
topic: admin-dashboard-ia-filtering
focus: admin page information architecture, filtering, and sorting
mode: repo-grounded
---

# Ideation: Admin Dashboard — Information Architecture & Filtering

## Grounding Context

### Codebase Context
- **Stack:** Rails 8.1, Inertia.js + React, PostgreSQL, SolidQueue, Tailwind CSS
- **Admin dashboard:** 3 sections — DiscogsOnboardingPanel, ActiveStoresSection (StoreGrid → StoreCard[]), ApplicantsSection (ApplicantGrid → ApplicantCard[])
- **Store cards:** name, @username link, health badge (severity), health bar (metrics + progress bars), error summary
- **DashboardMetrics:** Healthy/Processing/Attention counts — decorative, not interactive
- **Health model:** `StoreHealth` service computes key (failed/stale/partial/processing/healthy) and severity (danger/warning/working/good). Priority: failed → processing → stale → partial → healthy
- **No filter/sort/search UI** exists in the design system — would need to be built
- **Auto-refresh:** `useResync` hook polls every 3s when stores are syncing/enriching
- **Current sort:** `Store.order(created_at: :desc)` — chronological, not operational
- **Data available:** sync_status, enrichment_status, last_synced_at, last_enriched_at, total_listings, catalog_coverage, last_sync_error_summary
- **Product context:** Pre-revenue, single-developer, ~10-50 stores
- **Prior ideation:** 2026-05-15 admin UI ideation proposed attention-first sort (#2 overall) and "Red-First Dashboard" (rejected as too opinionated, noted as "better as a dashboard filter option")

### Topic Axes
1. Health-state visibility — which stores need attention, surfaced by what signals
2. Filtering & sorting controls — how the operator narrows and reorders the list
3. Information density & layout — card grid vs table vs hybrid, what to show at a glance vs drill-down
4. Action surface — what the operator can do from the dashboard (sync, onboard, retry)
5. Applicant workflow — how the waitlist/applicant pipeline is organized and actionable

## Ranked Ideas

### 1. Attention-Feed Default (Alert-Only Dashboard)
**Description:** Replace the flat store grid with a prioritized attention feed. Stores needing attention (failed, stale, partial, processing) appear as individual cards sorted by severity then time-in-state. Healthy stores collapse to a single summary line: "12 stores healthy." A "View all stores" toggle expands to the full grid when needed.

**Axis:** Information density & layout / Health-state visibility
**Basis:** `reasoned:` The operator's primary question — "which stores need my attention?" — is not answered by a chronological grid. The constraint-flip (no cards at all, just alerts) reveals that most of the card UI is informational overhead. PagerDuty, GitHub Notifications, and Slack all use alert feeds for operational work — not grids. The current DashboardMetrics counts already compute attention/processing/healthy buckets — the feed uses the same grouping logic.
**Rationale:** At 50 stores, the operator scrolls through 47 healthy cards to find 3 that need help. The attention-feed eliminates the entire scanning step. It also naturally handles growth — at 200 stores, the feed stays scannable because healthy stores are collapsed.
**Downsides:** Changes the mental model from "overview of everything" to "prioritized work list." Operator loses ambient awareness of healthy stores. Needs a clear "View all" escape hatch.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 2. Clickable Dashboard Metrics as Health Filters
**Description:** Make the three DashboardMetrics tiles (Healthy, Processing, Attention) clickable toggle buttons. Click "Attention: 3" to filter the store grid to only attention-needing stores. Click again to deselect. Multiple tiles can be selected simultaneously. Active filter state persists as URL search params (`?health=failed,stale`) for shareable, bookmarkable views.

**Axis:** Filtering & sorting controls
**Basis:** `direct:` `DashboardMetrics` already computes `healthyCount`, `attentionCount`, `processingCount` by filtering `active_stores` on `health.key`. The filter logic is identical to what the component already does — it just needs to emit selection upward and have `StoreGrid` consume it. No new UI primitives needed. Prior ideation explicitly said the Red-First idea was "better as a dashboard filter option."
**Rationale:** The metrics are the operator's natural entry point ("how many are bad?" → "show me the bad ones"). Making them interactive eliminates the disconnect between summary and detail. URL persistence enables sharing specific views.
**Downsides:** Requires deciding interaction model (toggle vs tab, single vs multi-select, URL persistence). Adds a filter state layer.
**Confidence:** 90%
**Complexity:** Low-Medium
**Status:** Unexplored

### 3. Health-State Section Grouping with Collapsible Headers
**Description:** Replace the flat StoreGrid with a section-grouped layout. Stores grouped under collapsible section headers: "Attention (3)" expanded by default, "Processing (2)" expanded, "Healthy (7)" collapsed. Each section header shows a count badge and is collapsible. Grouping derived from `health.key` — no new data, just a layout restructure.

**Axis:** Information density & layout
**Basis:** `reasoned:` The store array is already sorted by health severity. Grouping consecutive stores with the same `health.key` is a trivial array-to-grouped transformation. `SectionHeader` already exists and supports an `action` slot for future batch actions. Compounds: at 50 stores, collapsing "Healthy (40)" reduces cognitive load from 50 cards to 5 section headers.
**Rationale:** Section grouping is the structural investment that scales. At 10 stores, sections are visible but don't add much. At 50, collapsing healthy reduces noise. At 200, sections ARE the navigation.
**Downsides:** Needs default expanded/collapsed state decisions. Adds interaction complexity.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 4. Elapsed-Time Display on Processing Store Cards
**Description:** Compute elapsed time from last status-change timestamp. Display inline: "Syncing for 12 min." Add visual severity escalation (yellow → red) when processing exceeds thresholds (>30 min for sync, >10 min for enrichment).

**Axis:** Health-state visibility
**Basis:** `reasoned:` Backend provides `sync_status`, `enrichment_status`, `last_synced_at`, `last_enriched_at` on every `AdminStoreSummary`. `useResync` polls every 3s. No new data fields — just `Date.now() - lastStatusChangeAt`. Processing is the most ambiguous health state; this is the highest-value change for lowest effort.
**Rationale:** A store can be "Processing" for 5 min (normal) or 2 hours (stuck) with identical visual presentation. The operator cannot distinguish normal from stuck without terminal logs.
**Downsides:** Needs threshold values for escalation. Elapsed time goes stale if polling stops.
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

### 5. Per-Store Action Menu (Resync, Retry, View Storefront)
**Description:** Add a dropdown/kebab menu to each StoreCard header with context-aware actions: "Resync now" (queues FullStoreSyncJob), "View storefront" (link to storefront_path). Menu conditionally populated based on health.key — failed stores show "Retry", healthy stores show "View storefront", processing stores show "View progress."

**Axis:** Action surface
**Basis:** `direct:` FullStoreSyncJob already accepts `store_id`. `storefront_path` is already in `AdminStoreSummary`. The Admin::DashboardController needs a new `retry` action (POST to `/admin/stores/:id/retry`). The DiscogsOnboardingPanel demonstrates user-initiated action from the dashboard.
**Rationale:** Transforms the dashboard from read-only monitoring to an operational control surface. The gap between "seeing a problem" and "acting on it" is the dashboard's biggest friction point. Eliminates the majority of terminal context-switches.
**Downsides:** Needs confirmation for destructive actions. Adds interaction complexity.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 6. Search by Store Name or @Username
**Description:** Add a text search input above the store grid that filters `active_stores` by name or `discogs_username` in real-time (client-side). Search input positioned between metrics and grid, visible when 5+ stores exist. Pure client-side filtering — zero backend cost.

**Axis:** Filtering & sorting controls
**Basis:** `reasoned:` `AdminStoreSummary` includes `name` and `discogs_username`. The `active_stores` array is already loaded. Client-side filtering is an `Array.filter` call. Combined with health filters, creates composable queries: "Attention + search 'brooklyn'." Zero risk.
**Rationale:** At 50 stores, finding by name is the #2 operator action. At 200, search is essential. Building it now establishes the pattern at zero cost.
**Downsides:** UI clutter for small store counts. Needs clear/reset interaction.
**Confidence:** 90%
**Complexity:** Low
**Status:** Unexplored

### 7. Expandable Store Cards with Full Health Reasons
**Description:** Add expand/collapse to each StoreCard. Collapsed (default): compact view with name, health badge, health bar. Expanded: shows all `health.reasons` (currently only `reasons[0]` shown), full `last_sync_error_summary`, per-store action buttons (resync, view storefront).

**Axis:** Information density & layout / Action surface
**Basis:** `direct:` `AdminStoreHealth#props` computes `reasons` as a full array and `last_sync_error_summary`. `HealthStatus` currently calls `store.health.reasons[0]` — rest discarded. `StoreCard` already conditionally renders error summary. Expand reveals hidden data using existing primitives.
**Rationale:** Creates two-tier information density: scan at summary level, expand for investigation. The expand target becomes the natural home for future actions. Pattern generalizes to applicant cards, error reports, any admin list.
**Downsides:** Expand interaction needs animation consideration. Raises question of when to build a full store detail page.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Auto-Sort by Severity, Eliminate Sort Controls | Subset of attention-first sort |
| 2 | Binary Health (2 states) | Subset of section grouping |
| 3 | Pipeline Stage Heat Strip | Premature — requires pipeline stage tracking |
| 4 | Pipeline Completion Rings | Too speculative — new visual component |
| 5 | Health as Narrative, Not Badge | Better as expanded card content |
| 6 | Auto-Correlated Alert Groups | Requires pattern-matching infrastructure |
| 7 | Status Ticker Bar | Marginal value for persistent chrome |
| 8 | Daily Triage Cards | Overlaps with attention queue |
| 9 | Merge Applicants into Attention Queue | Better as separate follow-up |
| 10 | Applicant Bulk-Onboard | Separate concern |
| 11 | Remove Health Bar Progress Bars | Design opinion, not IA improvement |
| 12 | Health Score 0-100 | Health states serve this at current scale |
| 13 | Sparkline / Trend Heatmap | Requires unpersisted historical data |
| 14 | Replace Health Reasons with Action Directives | Subset of per-store actions |
| 15 | Command Palette | Over-engineered for 10-50 stores |
| 16 | Contextual Time-of-Day Views | Too speculative |
| 17 | Stale-Duration Indicator | Low priority vs structural changes |
| 18 | Catalog Coverage Sparkline | Secondary signal |
| 19 | Recently-Onboarded State | Nice-to-have, not core IA |
| 20 | Two-Operator Split View | Premature — single developer |
| 21 | Swipe-to-Resture | Premature — mobile gesture surface |
| 22 | Late-Order Flash Alerts | Subset of elapsed-time display |
| 23 | Contextual Action Panel | Overlaps with action menu + expandable cards |
| 24 | Store Trend Indicators | Requires unpersisted historical data |
| 25 | Batch Triage Mode | Builds on action menu — Phase 2 |
