---
date: 2026-06-07
topic: admin-store-management-controls
---

# Admin Store Management Controls

## Summary

Extend each active-store card on `/admin` with per-store operational controls for sync, enrichment, and permanent deletion. The card also shows the store's effective sync strategy and OAuth connection state so an admin can understand and operate a store without returning to terminal tasks.

---

## Problem Frame

The admin dashboard already summarizes store health, but recovery and maintenance still require lower-level operational tools. An admin can see that a store is stale, failed, or partially processed without being able to act on that state from the same screen.

The dashboard also does not expose whether a store is using the public Discogs API or authenticated CSV export. That distinction affects catalog completeness and helps explain store behavior, so it belongs alongside the existing health data.

Store deletion is especially sensitive. Removing a store destroys its imported inventory and operational history and may also leave behind OAuth credentials that no longer serve a store. The admin flow needs an explicit, high-friction confirmation before performing this irreversible action.

---

## Actors

- A1. Admin operator: Monitors stores, starts maintenance operations, and permanently removes stores.
- A2. Active store: A Milkcrate store using either public API or OAuth-backed CSV export sync.
- A3. Store owner: An optional OAuth-connected owner whose credentials may become orphaned when a store is deleted.

---

## Key Flows

- F1. Admin inspects store connection and sync behavior
  - **Trigger:** Admin opens `/admin`.
  - **Actors:** A1, A2
  - **Steps:** Each active-store card shows the effective sync strategy and whether OAuth is connected, alongside existing health information.
  - **Outcome:** Admin can distinguish public API stores from OAuth-backed stores and understand which inventory path a sync will use.
  - **Covered by:** R1, R2, R3

- F2. Admin runs a store sync
  - **Trigger:** Admin selects Sync on a store card.
  - **Actors:** A1, A2
  - **Steps:** Milkcrate queues a sync for that store and returns immediately. The control prevents a duplicate request while the store is syncing, and the dashboard continues showing current status and progress.
  - **Outcome:** Admin can refresh one store's inventory without using a rake task or job console.
  - **Covered by:** R4, R5, R6, R9, R10

- F3. Admin runs store enrichment
  - **Trigger:** Admin selects Enrich on a store card.
  - **Actors:** A1, A2
  - **Steps:** Milkcrate queues normal enrichment for that store's pending or stale metadata and returns immediately. The control prevents a duplicate request while enrichment is running, and the dashboard continues showing current status and progress.
  - **Outcome:** Admin can recover or refresh enrichment for one store without forcing all metadata to be rebuilt.
  - **Covered by:** R7, R8, R9, R10

- F4. Admin permanently deletes a store
  - **Trigger:** Admin selects Delete on a store card.
  - **Actors:** A1, A2, A3
  - **Steps:** The dashboard explains the permanent consequences and requires the admin to type the store's Discogs username. A matching confirmation removes the store and its dependent data. If its owner is no longer attached to another store, the orphaned owner record and OAuth credentials are also removed.
  - **Outcome:** Store data and unused credentials are removed only after deliberate confirmation.
  - **Covered by:** R11, R12, R13, R14, R15

---

## Requirements

**Store strategy and authorization**

- R1. Each active-store card shows the effective sync strategy that a new sync will use, expressed in operator-readable terms such as Public API or CSV Export.
- R2. Each active-store card separately shows whether the store has a valid OAuth connection.
- R3. Strategy and OAuth indicators reflect effective current behavior rather than relying on a stored value that may have drifted from the store's authorization state.

**Per-store sync**

- R4. Each active-store card provides a Sync action scoped only to that store.
- R5. Sync is queued as background work and uses the same universal sync behavior as other application sync entry points.
- R6. A store already syncing cannot receive a second sync request from the admin dashboard.

**Per-store enrichment**

- R7. Each active-store card provides an Enrich action scoped only to that store.
- R8. Enrich is queued as background work and performs normal pending or stale enrichment. It does not reset all enrichment metadata or force a complete re-enrichment.

**Operation feedback**

- R9. Sync and Enrich actions return promptly and provide a visible success or failure outcome on the dashboard.
- R10. While sync or enrichment is active, the corresponding action is unavailable and the existing dashboard polling keeps status and progress current.

**Permanent deletion**

- R11. Each active-store card provides a Delete action visually separated from routine operational actions.
- R12. Delete opens a confirmation step that identifies the store and clearly states that deletion is permanent.
- R13. The admin must type the store's exact Discogs username before permanent deletion can proceed.
- R14. Deleting a store removes the store and its dependent listings and order-event history.
- R15. After store deletion, an associated owner record and its OAuth credentials are also deleted when that owner no longer belongs to another store.
- R16. A missing store, stale confirmation, or username mismatch must fail safely without deleting another store or associated owner.

**Access and layout**

- R17. All store management actions remain protected by the existing fully authenticated admin session, including TOTP verification.
- R18. Controls remain usable without horizontal scrolling on mobile and fit the existing expanded store-card layout on wider screens.
- R19. All actions are per-store. This phase does not add bulk sync, bulk enrichment, or bulk deletion.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given one unauthenticated store and one valid OAuth-connected store, when the admin opens `/admin`, the first shows Public API and not connected while the second shows CSV Export and connected.
- AE2. **Covers R4, R5, R6, R9.** Given an idle store, when the admin selects Sync, one sync is queued for that store and the dashboard reports success. Given the store is already syncing, another sync is not queued.
- AE3. **Covers R7, R8, R9.** Given an idle store with pending or stale metadata, when the admin selects Enrich, one normal enrichment job is queued for that store without resetting all existing enrichment timestamps.
- AE4. **Covers R10.** Given a store is syncing or enriching, when the dashboard refreshes its active-store data, current progress remains visible and the matching operation cannot be triggered again.
- AE5. **Covers R11, R12, R13, R16.** Given the admin starts deletion, when the typed username does not exactly match the selected store, no records are deleted. When it matches, the permanent deletion may proceed.
- AE6. **Covers R14, R15.** Given a store has listings, order events, and an owner used by no other store, when deletion is confirmed, the store, dependent records, owner record, and OAuth credentials are removed.
- AE7. **Covers R15.** Given an owner is associated with another store, when one store is deleted, the shared owner and credentials remain available to the other store.
- AE8. **Covers R17.** Given a request lacks a fully authenticated admin session, when it targets any store operation, the operation is rejected through the existing admin authentication flow.
- AE9. **Covers R18, R19.** Given a phone-width viewport, when active-store cards render, Sync, Enrich, and Delete remain readable and usable without horizontal scrolling, and no bulk-operation surface appears.

---

## Success Criteria

- Admin can identify each store's effective inventory sync path and OAuth state from `/admin`.
- Admin can queue a sync or normal enrichment for one store without terminal access.
- Duplicate sync or enrichment requests are blocked while matching work is active.
- Admin receives immediate dashboard feedback and can watch background progress through existing polling.
- Permanent deletion requires an exact typed username and removes dependent store data.
- OAuth credentials do not remain after their final associated store is deleted.
- Existing onboarding, health monitoring, and job-console behavior continue unchanged.

---

## Scope Boundaries

- No bulk store operations.
- No archive, disable, restore, or deletion undo workflow.
- No forced full re-enrichment or enrichment reset control.
- No inline background-job logs or replacement for the existing jobs dashboard.
- No editing of store identity, strategy, OAuth credentials, or other store attributes.
- No manual strategy selector; strategy remains derived from the store's current authorization behavior.
- No cancellation of running sync or enrichment jobs.
- No deletion of waitlist applications that may share the deleted store's username.

---

## Key Decisions

- Per-store controls only: Operational actions belong on the store being diagnosed and should not introduce bulk-action risk.
- Show strategy and OAuth separately: Strategy explains what a sync will do, while OAuth state explains why that strategy is available.
- Effective behavior is authoritative: The dashboard should not present stale stored strategy metadata as operational truth.
- Normal enrichment only: The common recovery action enriches pending or stale metadata without the cost and risk of a forced rebuild.
- Typed confirmation for deletion: Exact username entry adds deliberate friction appropriate for irreversible data loss.
- Clean up orphaned credentials: Deleting the final store associated with an owner also removes credentials that no longer have a valid operational purpose.

---

## Dependencies / Assumptions

- Existing store health props and polling can represent sync and enrichment status after an admin-triggered action.
- Existing universal sync and enrichment jobs are suitable background entry points for admin actions.
- Store associations continue to define which imported records are removed with a store.
- A store owner may be retained when still associated with another store, even though the current product generally treats an owner as operating one store.
- Existing admin authentication and TOTP checks remain the authorization boundary for these controls.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R6, R10][Technical] Define duplicate-operation protection against race conditions between the request and background status transition, not only disabled UI state.
- [Affects R9][Design] Choose the exact success, blocked, and failure feedback presentation within the existing flash and store-card patterns.
- [Affects R11, R12, R13][Design] Choose the mobile-friendly confirmation interaction and destructive-action placement.
- [Affects R14, R15][Technical] Define transaction boundaries for store deletion and conditional orphan-owner cleanup.
