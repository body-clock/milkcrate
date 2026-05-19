---
date: 2026-05-17
topic: admin-discogs-storefront-onboarding
---

# Admin Discogs Storefront Onboarding

## Summary

Add an admin-only Discogs username lookup flow to `/admin`: an operator enters a Discogs username, sees a minimal verified identity preview, then explicitly starts storefront onboarding. Confirmation creates the store and queues the existing storefront creation process, matching the behavior of approved applicant onboarding.

---

## Problem Frame

Milkcrate already supports store applications: sellers apply, the admin reviews applicant rows, and approval starts onboarding. That works for inbound interest, but it leaves outbound or manually sourced stores awkward. When the admin already knows a Discogs seller should get a Milkcrate storefront, the only clean path is to create or fake an applicant first, or reach for lower-level operational tools.

The admin needs a direct, deliberate setup path that fits the existing dashboard workflow. The risky part is not the data entry itself; it is starting background sync work for the wrong seller because of a typo, stale memory, or similar username. A lightweight identity preview gives the admin a chance to verify the target before the storefront creation process begins.

---

## Actors

- A1. Admin operator: Sources stores directly, verifies a Discogs username, and starts onboarding from `/admin`.
- A2. Discogs seller: A seller who may not have submitted a Milkcrate application but can become an active Milkcrate store.
- A3. Active store: A store record in Milkcrate that enters the existing processing, sync, enrichment, and health workflow after onboarding starts.

---

## Key Flows

- F1. Admin verifies a sourced seller
  - **Trigger:** Admin enters a Discogs username into the admin-created storefront flow.
  - **Actors:** A1, A2
  - **Steps:** The admin submits the username. Milkcrate reuses the existing Discogs seller verification behavior from the unclaimed-slug flow. If the username is valid and found, the admin sees a minimal identity preview with enough information to confirm the seller. If the username is invalid, not found, already active, or already in the applicant list, the admin sees a clear blocking state instead of a create action.
  - **Outcome:** Admin can verify the intended seller before starting onboarding.
  - **Covered by:** R1, R2, R3, R4, R5

- F2. Admin starts storefront onboarding
  - **Trigger:** Admin confirms a verified Discogs seller from the preview state.
  - **Actors:** A1, A3
  - **Steps:** The admin chooses the create/onboard action. Milkcrate creates the store and queues the existing storefront creation process. The admin returns to `/admin` with a clear success or failure message. Once the store exists, it appears in the active-store area with the same processing and health behavior as an approved applicant.
  - **Outcome:** Admin can start a new storefront without creating an applicant first or leaving the dashboard.
  - **Covered by:** R6, R7, R8, R9

---

## Requirements

**Admin lookup**
- R1. `/admin` exposes an admin-only way to enter a Discogs username for a store that did not come through the applicant flow.
- R2. The lookup reuses the existing Discogs seller verification capability used by the unclaimed-slug invitation flow, including its username validity checks and Discogs existence check.
- R3. A successful lookup shows a minimal identity preview: Discogs username plus basic seller identity returned by the lookup, such as display name and avatar when available.
- R4. The preview is intentionally basic; it is not an inventory review, applicant profile, or seller CRM surface.
- R5. The lookup blocks or clearly warns when the username is invalid, not found, already has an active store, or already has a current applicant record.

**Onboarding confirmation**
- R6. Store creation only starts after the admin explicitly confirms from a successful preview state.
- R7. Confirmation uses the same storefront creation behavior as applicant approval: create the store and queue the long-running sync/enrichment work instead of running it synchronously in the admin request.
- R8. After confirmation, the new store appears in the active-store dashboard lane with the existing processing and health states.
- R9. Existing applicant approval remains unchanged; this flow is an additional admin path for stores the operator sources directly.

**Operator experience**
- R10. The admin flow must make the two-step state obvious: lookup first, confirmation second.
- R11. Success and failure outcomes must be visible on the dashboard without requiring the admin to inspect logs.
- R12. The flow must remain usable on mobile and desktop within the existing admin dashboard experience.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R6.** Given the admin enters a valid Discogs seller username that has no Store or Waitlist record, when the lookup succeeds, the dashboard shows a minimal identity preview and a separate confirmation action.
- AE2. **Covers R5.** Given the admin enters a username that is already an active Milkcrate store, when lookup runs, the dashboard blocks duplicate onboarding and points the admin at the existing store state.
- AE3. **Covers R5.** Given the admin enters a username already present in applicants, when lookup runs, the dashboard blocks direct creation and makes clear that the applicant path already exists.
- AE4. **Covers R6, R7, R8.** Given the admin confirms a verified seller, when onboarding starts, the request returns without waiting for full sync/enrichment and the new store appears in the active-store area as processing.
- AE5. **Covers R4, R10.** Given a lookup succeeds, when the preview renders, it shows only basic seller identity and does not ask the admin to review inventory, notes, or application-style fields before confirming.

---

## Success Criteria

- Admin can create a storefront for a sourced Discogs seller without creating an applicant record first.
- Admin has a deliberate preview step that reduces wrong-seller or typo-driven onboarding.
- The direct admin path behaves consistently with applicant approval after confirmation.
- Existing public unclaimed-slug verification and admin lookup use the same seller verification rules.
- Planning can focus on implementation details without inventing the lookup-confirm-create flow, duplicate handling, or scope boundaries.

---

## Scope Boundaries

- No admin-created applicant records as an intermediate step.
- No full seller CRM, notes workflow, rejection workflow, or outreach tracking.
- No detailed inventory review or listing-count preflight before creation.
- No change to the public application flow or existing applicant approval behavior.
- No automatic seller communication when an admin-created storefront is queued.
- No dedicated job/log console replacement inside the admin dashboard.

---

## Key Decisions

- Preview before creation: The admin should verify basic seller identity before any long-running onboarding work starts.
- Reuse seller verification: Admin lookup should stay consistent with the public unclaimed-slug invitation flow instead of inventing separate Discogs validation behavior.
- Basic identity only: The flow is an operator shortcut, not a second applicant-review system.
- Preserve applicant approval: Inbound applications and admin-sourced store creation are parallel entry points into the same onboarding process.

---

## Dependencies / Assumptions

- Existing Discogs seller lookup behavior is sufficient for admin preview identity.
- Existing store onboarding behavior can be triggered without a waitlist record.
- Existing admin dashboard health states can represent a newly created store while sync and enrichment are still running.
- Existing authentication/authorization around `/admin` is the access boundary for this flow.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Technical] Decide the exact dashboard behavior for an already-applied username: link to the applicant action, show a passive warning, or both.
- [Affects R10, R11][Design] Decide whether the lookup and preview live inline in the dashboard header, in a dedicated panel, or in another admin dashboard region.
