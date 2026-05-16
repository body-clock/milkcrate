---
date: 2026-05-16
topic: admin-dashboard-workflow
---

# Admin Dashboard Workflow

## Summary

Turn `/admin` into a mobile-first operational dashboard for Milkcrate: active stores with at-a-glance health, plus current applicants with a direct queued onboarding action. Onboarded applicants move into the active-store area immediately with a processing state so the dashboard becomes the place to watch a store go live.

---

## Problem Frame

The current admin surface only lists waitlist applications. That is enough to know who applied, but it does not answer the operational questions that matter once stores start coming online: which stores are healthy, which are still processing, which need attention, and what should happen next for a new applicant.

Without a dashboard, onboarding would likely happen by manually running the store rake task, checking jobs or logs, and visiting the storefront to see whether it worked. That workflow is brittle because it spreads one operational task across the terminal, job system, storefront, and admin page. The admin experience needs to collapse that into one readable control surface.

---

## Actors

- A1. Admin operator: Reviews applicants, onboards approved stores, and monitors store health from `/admin`.
- A2. Applicant store: A Discogs seller who submitted the waitlist form and can become an active Milkcrate store.
- A3. Active store: A store record in Milkcrate that may be healthy, processing, stale, partial, or failed.

---

## Key Flows

- F1. Admin reviews dashboard
  - **Trigger:** Admin opens `/admin`.
  - **Actors:** A1, A2, A3
  - **Steps:** The dashboard loads active stores and current applicants. Active stores are presented first with health status, sync/enrichment recency, inventory coverage, and key store metadata. Applicants appear in a separate section with the information needed to decide whether to onboard.
  - **Outcome:** Admin can tell which stores are great, which are processing, which need attention, and which applicants are waiting.
  - **Covered by:** R1, R2, R3, R4, R7

- F2. Admin onboards an applicant
  - **Trigger:** Admin chooses the onboard action for a waitlist applicant.
  - **Actors:** A1, A2, A3
  - **Steps:** The action creates or starts onboarding for the applicant's store, queues the long-running sync/enrichment work in the background, and returns quickly. The applicant leaves the active applicant list once a store record exists. The new store appears in the active-store area with a processing indicator.
  - **Outcome:** Admin does not need to run a rake task manually or wait for long-running work in the request.
  - **Covered by:** R5, R6, R8, R9

- F3. Admin spots a store needing attention
  - **Trigger:** A store has failed sync/enrichment, stale data, partial/low coverage, or missing expected store readiness signals.
  - **Actors:** A1, A3
  - **Steps:** The active-store section visually distinguishes the store from healthy stores, explains the reason at a glance, and exposes enough metadata for the admin to decide whether to investigate jobs, retry later, or check the storefront.
  - **Outcome:** Bad or uncertain store state is obvious without opening logs first.
  - **Covered by:** R2, R3, R4, R10

---

## Requirements

**Dashboard structure**
- R1. `/admin` presents a two-lane dashboard: active stores first, current applicants second.
- R2. The active-store area shows every store that exists in Milkcrate, including stores still processing their first sync or enrichment.
- R3. Each active store has an opinionated health state that is visually obvious: healthy, processing, stale, partial, failed, or otherwise needs attention.
- R4. Each active store shows the metadata needed for a quick health check: last sync, last enrichment, sync status, enrichment status, inventory coverage, total listings, and recent sync error presence when applicable.

**Applicant onboarding**
- R5. The applicant area shows current waitlist entries that do not already have a corresponding active store.
- R6. Each eligible applicant has an onboard action available directly from the applicant list or card.
- R7. Applicant rows/cards continue to show the existing useful application details: store name, email, Discogs username, inventory size, notes, and submitted date.
- R8. Onboarding is queued in the background rather than run synchronously from the admin request.
- R9. After onboarding starts and a store exists, the applicant leaves the active applicant area and the corresponding store appears in the active-store area as processing.

**Health and attention model**
- R10. Health presentation must make good and bad states unmistakable: healthy stores should look settled, processing stores should look in progress, and failed/stale/partial stores should draw attention without requiring the admin to parse raw fields.
- R11. Failed sync or enrichment, stale sync or enrichment timing, partial/low inventory coverage, and missing readiness data count as attention-worthy states.
- R12. The dashboard summarizes operational state but does not replace dedicated job/log tooling.

**Responsive dashboard experience**
- R13. The dashboard is mobile-first: active stores and applicants are readable and actionable on a phone with no horizontal scrolling.
- R14. On wider screens, the same content expands into a richer dashboard layout with stronger information density and clear section hierarchy.
- R15. The admin UI should feel like a polished operational dashboard, using the existing Inertia frontend and strong reusable UI primitives where appropriate. Exact primitive/component choices are deferred to planning.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R4.** Given three stores exist, when the admin opens `/admin`, the active-store section appears before applicants and shows each store with sync/enrichment recency, statuses, coverage, and listing count.
- AE2. **Covers R3, R10, R11.** Given one store is healthy, one is processing, and one has a failed sync, when the dashboard renders, those states are visually distinct without relying only on the raw status text.
- AE3. **Covers R5, R6, R7.** Given two waitlist entries have no matching store, when the admin opens `/admin`, both appear in the applicant section with application details and an onboard action.
- AE4. **Covers R8, R9.** Given a waitlist applicant is onboarded, when the admin triggers onboard, the request returns without waiting for the full sync/enrichment process, the applicant no longer appears as an active applicant, and the new store appears as processing.
- AE5. **Covers R13, R14.** Given a phone-width viewport, when `/admin` renders, each active store and applicant remains readable and actionable without horizontal scrolling. Given a desktop-width viewport, the content expands into a dashboard layout rather than a stretched mobile list.
- AE6. **Covers R12.** Given a store has an operational issue, when the dashboard renders, it summarizes the issue and relevant timing/status metadata but does not expose full background job logs inline.

---

## Success Criteria

- Admin can open `/admin` and immediately understand which stores are healthy, processing, or need attention.
- Admin can onboard an applicant without leaving the dashboard or manually running the store rake task.
- A newly onboarded store has an obvious processing state while sync/enrichment work runs.
- The waitlist no longer mixes applicants that still need action with stores that have already entered onboarding.
- The dashboard works cleanly on mobile and feels intentionally designed on desktop.
- Planning can focus on implementation details without inventing dashboard lanes, health categories, onboarding behavior, or responsive expectations.

---

## Scope Boundaries

- No full applicant approval wizard in this version.
- No applicant CRM, notes workflow, rejection workflow, or seller communication automation.
- No inline full job logs or detailed job-console replacement inside `/admin`.
- No broad store-editing surface beyond the onboarding action and health overview.
- No automatic retry policy is required by this requirements doc.
- Exact UI component library, route/controller shape, job class naming, and health computation internals are deferred to planning.

---

## Key Decisions

- Two-lane dashboard: Active stores and applicants are the two primary admin jobs for this phase.
- Queue onboarding: Long-running sync/enrichment work should happen in the background so the admin action stays fast.
- Move onboarded applicants into active stores: Once a store exists, the dashboard should treat it as a store in progress, not as a pending applicant.
- Opinionated health display: The dashboard should interpret raw operational metadata into clear states rather than forcing the admin to mentally combine timestamps, statuses, and coverage.
- Mobile-first, dashboard-expanded: Phone readability is required, but desktop should use the space to feel like a real admin console.

---

## Dependencies / Assumptions

- Existing store metadata is enough for the first health view: sync status, enrichment status, last synced/enriched timestamps, catalog coverage, inventory page count, total listings, and sync error fields.
- Existing waitlist data is enough for the applicant section.
- Existing background job infrastructure can queue the onboarding work.
- Existing Inertia infrastructure can support a richer admin dashboard experience.
- "Online stores" means stores already created in Milkcrate, including stores still processing their first sync/enrichment.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R3, R10, R11][Technical] Define the exact health-state precedence when a store has multiple signals, such as stale data plus partial coverage.
- [Affects R8, R9][Technical] Decide whether onboarding should wrap the existing add-store behavior in a new reusable job, service, or other application boundary.
- [Affects R15][Design] Choose the concrete UI primitive/component approach for the Inertia admin dashboard, including whether to introduce shadcn-style primitives or use existing local components.
