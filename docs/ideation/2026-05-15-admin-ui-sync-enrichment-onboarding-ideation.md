---
date: 2026-05-15
topic: admin-ui-sync-enrichment-onboarding
focus: admin UI for sync times/status, enrichment times/status, and waitlist-to-store onboarding
mode: repo-grounded
---

# Ideation: Admin UI — Sync, Enrichment & Onboarding

## Grounding Context

### Codebase Context
- **Stack:** Rails 8.1, Inertia.js + React (public pages), ERB (admin), PostgreSQL, SolidQueue, Tailwind
- **Current admin:** Single page at `/admin` → ERB waitlist table (name, email, discogs_username, inventory_size, notes, created_at). No navigation, one route. HTTP basic auth via `Admin::BaseController`.
- **Mission Control Jobs** mounted at `/jobs` for job queue monitoring.
- **Architectural constraint:** Admin deliberately ERB-only (not Inertia/React) — admin is a tool, not a customer surface.

### Store Model (data exists, unsurfaced)
- `sync_status`: `idle` | `syncing` | `failed`
- `enrichment_status`: `idle` | `enriching` | `failed`
- `last_synced_at`, `last_enriched_at`
- `last_sync_error`, `last_sync_error_at`
- `catalog_coverage`: `unknown` | `near_complete` | `partial`
- `total_listings`, `inventory_page_count`
- `stale?` method: `last_synced_at.nil? || last_synced_at < 23.hours.ago`

### Waitlist Model
- `name`, `email`, `discogs_username`, `inventory_size` (self-reported), `notes`
- No status field, no connection to Store model

### Job Pipeline
- `FullStoreSyncJob` → chains to `EnrichmentJob` → chains to `DailyCurationJob`
- Recurring nightly via `config/recurring.yml`
- Ad-hoc via rake tasks: `milkcrate:sync`, `milkcrate:sync:quick`, `milkcrate:setup`, `milkcrate:curate`

### Strategy Context
- STRATEGY.md track: "Store onboarding & freemium model" — prove value with near-zero seller effort
- Key milestone: Philamoca record fair **June 6, 2026** — pitch to vendors, distribute branded bags, gather interest
- Product is pre-revenue, single-developer project
- Currently configured for one default store (`philadelphiamusic`)

### User Request
Enhance admin UI to see:
1. Sync times and status
2. Enrichment times and status
3. Ability to run onboard automatically for stores that have applied
4. `/admin` = dashboard with live stores, `/admin/waitlist` = applications

## Topic Axes
1. **Dashboard / Operations Visibility** — aggregate system health, all-stores status at a glance
2. **Per-Store Sync Lifecycle** — individual store sync history, timing, errors, manual triggers, enrichment tracking
3. **Waitlist → Store Conversion** — onboarding flow from application review through store creation and first pipeline run
4. **Job Pipeline Integration** — connecting admin views to SolidQueue job status, showing chain position (sync→enrich→curate)
5. **Admin Information Architecture** — how admin pages are organized, navigated, and linked together

## Ranked Ideas

### 1. One-Click Onboard from Waitlist
**Description:** Add an "Onboard" action button to each waitlist row. Clicking it creates a Store record pre-populated from waitlist data, validates discogs_username uniqueness against existing stores, queues FullStoreSyncJob, and shows inline status feedback. Add waitlist status states: `pending → approved → provisioning → live → rejected`. The waitlist page becomes an active onboarding queue rather than a passive table.

**Axis:** Waitlist → Store Conversion

**Basis:** `direct:` Waitlist model (name, email, discogs_username) directly overlaps with Store.create! parameters. FullStoreSyncJob accepts store_id (app/jobs/full_store_sync_job.rb). The README documents creating stores "from the Rails console" — zero admin UI exists for this.

**Rationale:** Currently each new store requires: SSH/terminal → Rails console → Store.create → run sync rake task → wait. This is the bottleneck for June 6 store onboarding. One click compresses ~5 minutes of terminal work into a single server-rendered action with pipeline visibility.

**Downsides:** Requires a waitlist status column migration. Error handling needed for edge cases (duplicate discogs_username, Discogs API unreachable at creation time).

**Confidence:** 95%
**Complexity:** Medium (new controller action + ERB view updates + waitlist status column migration + validation logic)
**Status:** Unexplored

### 2. Store Operations Dashboard
**Description:** Replace `/admin` landing page from bare waitlist table to a store operations dashboard showing: aggregate counters (total stores, stale, failed syncs, failed enrichments), health cards per store (name, sync_status with color badge, enrichment_status, last_synced_at relative time, catalog_coverage), attention-first sort (failed → stale → syncing → healthy), and a "Sync All Stale" batch action. Move waitlist to `/admin/waitlist`. This directly matches the pattern of `/admin = dashboard with live stores`.

**Axis:** Dashboard / Operations Visibility

**Basis:** `direct:` Store model has sync_status (idle/syncing/failed), enrichment_status (idle/enriching/failed), stale? method (last_synced_at < 23h), catalog_coverage, total_listings — all in schema, zero surfaced in admin. Routes currently point `get "/admin"` to `admin/waitlists#index`.

**Rationale:** The first question any operator has on opening admin is "is everything okay?" — currently answered by Mission Control logs or Rails console. A dashboard answers in one glance and scales O(1) effort with O(N) stores. The user explicitly named this layout: "/admin is the dashboard with live stores."

**Downsides:** Adds new route and controller. Changes the mental model of "/admin" from "applications" to "operations." Waitlist needs a new permanent URL.

**Confidence:** 90%
**Complexity:** Medium (new Admin::DashboardController, ERB views, route restructuring, shared admin layout)
**Status:** Unexplored

### 3. Per-Store Sync Detail Page
**Description:** Create `/admin/stores/:id` showing a single store's full sync lifecycle: sync history (timeline of sync attempts with timestamps, duration, status, error), enrichment run history, catalog state (total_listings, inventory_page_count, catalog_coverage), and action buttons: "Sync Now" (queues FullStoreSyncJob), "Re-enrich" (queues EnrichmentJob), "Re-curate" (queues DailyCurationJob). Show last_sync_error with expandable stack trace. Phase 2 adds a sync_events table for persisted history across runs.

**Axis:** Per-Store Sync Lifecycle

**Basis:** `direct:` Store model has last_synced_at, last_enriched_at, last_sync_error, last_sync_error_at, total_listings, inventory_page_count, catalog_coverage. FullStoreSyncJob, EnrichmentJob, DailyCurationJob each accept store_id. User explicitly asked: "see sync times and status, enrichment times and status."

**Rationale:** When sync or enrichment fails, current recovery requires: notice → open terminal → inspect store → identify error → re-queue job. A detail page with error display + one-click retry turns 10-minute debugging into 10 seconds. Historical tracking (sync_events table) enables trend analysis over time.

**Downsides:** Persistent sync history requires a new migration and model. First iteration can use current model fields (no history, just current state display).

**Confidence:** 90%
**Complexity:** Medium (new Admin::StoresController, ERB views, optional sync_events migration)
**Status:** Unexplored

### 4. Admin Navigation Frame
**Description:** Build a shared admin navigation partial: top bar with brand mark + breadcrumb, and sidebar/top-nav links: Dashboard (`/admin`), Stores (`/admin/stores`), Applications (`/admin/waitlist`), Jobs (`/jobs` — external link to Mission Control). Implement as a shared partial in `app/views/admin/_nav.html.erb` so every admin page inherits it. Use lifecycle-based labels with count badges on Applications.

**Axis:** Admin Information Architecture

**Basis:** `direct:` Current admin has zero navigation — one route, one page, no layout chrome beyond application.html.erb. Routes are flat: `get "/admin"` only. No Admin::StoresController or admin nav concept exists.

**Rationale:** Every new admin page needs to be reachable without typing URLs. A shared nav is a fixed-cost investment that compounds across every future admin page. It also signals admin as a designed tool with its own identity, not an accidental collection of endpoints.

**Downsides:** Needs to work within the existing application.html.erb layout. Responsive behavior for mobile admin access needs consideration.

**Confidence:** 95%
**Complexity:** Low (shared partial + route declarations + admin layout refinement)
**Status:** Unexplored

### 5. Sync Error Classification & Auto-Retry
**Description:** Classify sync errors into categories (rate_limit, auth_failure, network, discogs_api, listing_parse) with per-store error history. Distinguish "new error" vs "recurring error" in the dashboard. Implement auto-retry with exponential backoff (1h → 4h → 16h → give up) in the FullStoreSyncJob rescue block. A store surfaces as "needs attention" only after the retry chain is exhausted.

**Axis:** Per-Store Sync Lifecycle / Job Pipeline Integration

**Basis:** `direct:` FullStoreSyncJob rescue block catches StandardError, logs error, calls store.mark_sync_failed!, and re-raises (app/jobs/full_store_sync_job.rb lines 24-30). Store model has last_sync_error (free-text) and last_sync_error_at. `reasoned:` Most sync failures in API-driven systems are transient (rate limits, network blips) — requiring admin attention for each one scales linearly with store count.

**Rationale:** Auto-retry absorbs the common case (transient failures). Classification surfaces pattern changes (all stores failing same error = Discogs API change). Without classification, operator fatigue from false positives makes the dashboard less useful.

**Downsides:** Auto-retry changes failure semantics — stores remain in "syncing" state longer during retry window. Backoff schedule needs tuning. Error classification requires error-class matching or message parsing.

**Confidence:** 80%
**Complexity:** Medium (error classification logic in FullStoreSyncJob rescue, retry job with backoff, error history view in admin)
**Status:** Unexplored

### 6. Pipeline Phase & Timing Visibility
**Description:** On the dashboard and per-store detail page, show each store's position in the sync→enrich→curate pipeline: which phase is currently running, elapsed time in current phase, and flags for exceeding expected duration (sync > 30min, enrich > 10min). Aggregate "door-to-live" timing (waitlist created → first successful sync+enrich+curate) as a system metric on the dashboard.

**Axis:** Job Pipeline Integration

**Basis:** `direct:` Store model has both sync_status and enrichment_status enums. FullStoreSyncJob chains to EnrichmentJob then DailyCurationJob (full_store_sync_job.rb lines 20-21). `reasoned:` With multiple stores, an operator needs to know not just "is this store syncing" but "has it been syncing for 5 minutes (normal) or 45 minutes (stuck)?"

**Rationale:** Pipeline phase visibility prevents the common failure mode of "store has been syncing for an hour but nobody noticed because the badge only says 'syncing' without duration." Elapsed time turns a stateless badge into a triage signal.

**Downsides:** Requires tracking when the status transitioned — either a sync_started_at timestamp or a sync_events table. Simple version: last_synced_at + sync_status = "syncing" gives elapsed time.

**Confidence:** 75%
**Complexity:** Low-Medium (status computation from existing fields + view formatting on dashboard and store detail page)
**Status:** Unexplored

### 7. Waitlist Auto-Approval Threshold
**Description:** On the waitlist page, add a "Quick check" action that runs a lightweight Discogs API inventory preview for each applicant. Automatically flag entries that meet approval criteria (valid Discogs username, >100 inventory items, no duplicate existing store). For qualified entries, show "Auto-approve eligible" with a single-click "Approve & Onboard" that creates Store, runs pipeline, and self-fires. For below-threshold entries, show the blocking criteria so the operator knows what's needed.

**Axis:** Waitlist → Store Conversion

**Basis:** `direct:` DiscogsClient exists (app/services/discogs_client.rb). StoreSync::InventoryFetcher exists — the Discogs API integration for inventory checking is already built. Waitlist has inventory_size (self-reported string) and discogs_username. `reasoned:` For the June 6 fair, the operator will receive applications in bursts. Pre-qualifying entries before the admin reads them removes cognitive load.

**Rationale:** Threshold auto-checking shifts waitlist review from "is this person legit?" to "approve all eligible entries." The admin focuses attention on borderline cases rather than reading every application equally.

**Downsides:** Discogs API rate limit for inventory previews per waitlist entry. False negatives for valid stores the API can't reach. Need "re-check" handling for entries that failed but may have been fixed.

**Confidence:** 70%
**Complexity:** Medium (Discogs inventory check call per entry, threshold configuration, UI for showing block reasons)
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Zero-Click Store Provisioning (auto-create without admin review) | Too risky for early stage — creates stores before anyone validates the applicant |
| 2 | Red-First Dashboard (show only exceptions as default) | Too opinionated as default; better as a dashboard filter option |
| 3 | Tickle Sync (trigger sync on page view) | Rate-limit concern; triggers full syncs on page views |
| 4 | The Admin Is One Page (single-page state machine) | Over-constrained; limits growth to 5+ admin pages needed post-June-6 |
| 5 | Self-Service Activation Token (email to store owner) | Adds email-delivery complexity; better as Phase 2 refinement of One-Click Onboard |
| 6 | Waitlist Applicant Portal (public status page) | Scope expansion beyond admin UI — public-facing feature, not admin |
| 7 | Ephemeral Stores with Auto-Archival | Premature for early stage; solves problem that doesn't exist yet |
| 8 | Configurable Sync Pulse Per Store | Premature optimization; single recurring schedule sufficient initially |
| 9 | Admin as CLI / Rake Tasks | User asked about admin UI, not CLI; existing rake tasks cover terminal workflows |
| 10 | Batch Sync All Stale | Merged into Dashboard survivor (action button on dashboard) |
| 11 | Notification-Driven Admin (Slack/email alerts) | Interesting but separate concern; better after core dashboard exists |
| 12 | Readiness Score (computed pipeline status) | Overlaps with dashboard health cards showing sync/enrichment status directly |
