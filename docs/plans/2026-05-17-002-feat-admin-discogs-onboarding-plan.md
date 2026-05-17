---
title: "feat: Admin Discogs storefront onboarding"
type: feat
status: completed
date: 2026-05-17
origin: docs/brainstorms/2026-05-17-admin-discogs-storefront-onboarding-requirements.md
---

# feat: Admin Discogs Storefront Onboarding

## Summary

Build the admin-created storefront flow by extending the existing admin dashboard with a verified Discogs lookup state and a separate confirmation action. The backend should reuse the existing seller lookup service for Discogs validation, add admin-only duplicate/applicant checks behind `/admin`, and route confirmation through the existing store onboarding operation.

---

## Problem Frame

The current admin dashboard can approve inbound applicants, but manually sourced Discogs sellers still need an awkward workaround: create an applicant first or use lower-level operational tooling. This plan adds a direct admin path while preserving the deliberate preview step needed to avoid queuing sync work for the wrong seller.

---

## Requirements

- R1. `/admin` exposes an admin-only way to enter a Discogs username for a store that did not come through the applicant flow.
- R2. The lookup reuses the existing Discogs seller verification capability used by the unclaimed-slug invitation flow, including username validity and Discogs existence checks.
- R3. A successful lookup shows a minimal identity preview: Discogs username plus basic seller identity returned by the lookup, such as display name and avatar when available.
- R4. The preview is intentionally basic; it is not an inventory review, applicant profile, or seller CRM surface.
- R5. The lookup blocks or clearly warns when the username is invalid, not found, already has an active store, or already has a current applicant record.
- R6. Store creation only starts after the admin explicitly confirms from a successful preview state.
- R7. Confirmation uses the same storefront creation behavior as applicant approval: create the store and queue long-running sync/enrichment work instead of running it synchronously in the admin request.
- R8. After confirmation, the new store appears in the active-store dashboard lane with existing processing and health states.
- R9. Existing applicant approval remains unchanged; this flow is an additional admin path for stores the operator sources directly.
- R10. The admin flow must make the two-step state obvious: lookup first, confirmation second.
- R11. Success and failure outcomes must be visible on the dashboard without requiring the admin to inspect logs.
- R12. The flow must remain usable on mobile and desktop within the existing admin dashboard experience.

**Origin actors:** A1 (Admin operator), A2 (Discogs seller), A3 (Active store)
**Origin flows:** F1 (Admin verifies a sourced seller), F2 (Admin starts storefront onboarding)
**Origin acceptance examples:** AE1-AE5

---

## Scope Boundaries

- No admin-created applicant records as an intermediate step.
- No full seller CRM, notes workflow, rejection workflow, or outreach tracking.
- No detailed inventory review or listing-count preflight before creation.
- No change to the public application flow or existing applicant approval behavior.
- No automatic seller communication when an admin-created storefront is queued.
- No dedicated job/log console replacement inside the admin dashboard.

### Deferred to Follow-Up Work

- Admin deep links or richer controls for applicant records: useful later, but this version only needs to prevent bypassing an already-applied seller.
- Public lookup endpoint hardening beyond the current service behavior: this plan keeps the public slug invitation flow unchanged.

---

## Context & Research

### Relevant Code and Patterns

- `DiscogsSellerLookup` already centralizes username plausibility checks, reserved slug rejection, Discogs profile lookup, API-error handling, and caching.
- `Api::DiscogsLookupController` exposes that lookup for the public unclaimed-slug invitation page; admin-specific Store/Waitlist state should stay behind admin auth instead of being added to the public response.
- `StoreOnboarding` already accepts `discogs_username:` with optional `waitlist:`, creates the store, and queues `FullStoreSyncJob`.
- `Admin::OnboardingsController` already handles applicant approval and redirects back to `/admin` with flash notices/alerts.
- `Admin::DashboardPresenter` already shapes `active_stores` and `applicants`; this is the right boundary for server-rendered admin props.
- `app/frontend/pages/admin/dashboard.tsx` already renders the admin dashboard with local `Button`, `Card`, `Badge`, `SectionHeader`, and `StatusDot` primitives.
- Request coverage exists for admin dashboard auth/rendering, applicant onboarding, public Discogs lookup, and the store onboarding service.
- Frontend coverage exists for admin dashboard content, flash messages, applicant onboarding form, and compact/wide rendering via `renderWithTier`.

### Institutional Learnings

- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` establishes compact/comfy/wide viewport testing and warns against untested responsive branches.
- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` reinforces using a shared service boundary when multiple entry points need the same behavior.

### External References

- None. Local Rails, Inertia, request-spec, service-spec, and React test patterns are sufficient for this feature.

---

## Key Technical Decisions

- **Admin lookup gets an admin endpoint:** Reuse `DiscogsSellerLookup` for Discogs verification, but add admin-only state checks for existing stores and applicants behind `Admin::BaseController`. This preserves the public lookup contract while giving the dashboard operational state.
- **Already-applied sellers stay on the applicant path:** When a username already has a Waitlist record, block direct admin-created store creation and point the operator back to applicant onboarding behavior. This avoids two ways to onboard the same seller.
- **Confirmation reuses `StoreOnboarding`:** The manual admin path should call the same application operation as applicant approval, with `waitlist: nil`, so store creation and job queuing stay consistent.
- **Dashboard state remains server-authored except for lookup fetch state:** Active store/applicant lists continue to come from Inertia props; the lookup panel owns only transient input, loading, preview, and error states.
- **Keep the UI inline and basic:** Add the lookup/preview control as an operational dashboard panel, not a modal, wizard, or full applicant editor.

---

## Open Questions

### Resolved During Planning

- Already-applied behavior: block direct creation and guide the operator to use the existing applicant onboarding path.
- Lookup reuse boundary: reuse the seller lookup service, not only the public API endpoint, because admin lookup has extra Store/Waitlist state.
- Preview scope: basic seller identity only; no inventory count or application-like fields.

### Deferred to Implementation

- Exact microcopy for each lookup state: implement with clear operator-facing labels, then tune through frontend tests.
- Exact placement within the dashboard: default to an inline panel near the top of the admin dashboard; adjust if implementation shows a clearer layout within the existing structure.

---

## Implementation Units

### U1. Admin Storefront Lookup Boundary

**Goal:** Add an authenticated backend lookup path that reuses existing Discogs verification and adds admin-only duplicate/applicant state.

**Requirements:** R1, R2, R3, R5, R9, R11; F1; AE1, AE2, AE3

**Dependencies:** None

**Files:**
- Create: `app/controllers/admin/discogs_lookups_controller.rb`
- Modify: `config/routes.rb`
- Create: `spec/requests/admin/discogs_lookups_spec.rb`
- Modify if needed: `app/services/discogs_seller_lookup.rb`
- Modify if needed: `spec/services/discogs_seller_lookup_spec.rb`

**Approach:**
- Add an admin-authenticated lookup route for a submitted Discogs username.
- Delegate Discogs validity/existence checks to `DiscogsSellerLookup` so reserved names, username shape, API failures, and cached profile lookup stay consistent with the unclaimed-slug flow.
- After the seller lookup succeeds, check normalized username against `Store` and `Waitlist`.
- Return a UI-ready state that distinguishes: found and creatable, invalid/not found, upstream lookup error, already active store, and existing applicant.
- Do not add Store/Waitlist state to the public `/api/discogs/lookup/:username` response.
- If `DiscogsSellerLookup` does not currently return normalized username, either derive normalization consistently in the admin boundary or extend the service in a backward-compatible way.

**Patterns to follow:**
- `app/controllers/api/discogs_lookup_controller.rb` for seller lookup delegation.
- `app/controllers/admin/base_controller.rb` for admin auth.
- `spec/requests/discogs_lookup_spec.rb` for request-level lookup stubbing.
- `spec/requests/admin/dashboard_spec.rb` and `spec/requests/admin/onboardings_spec.rb` for admin auth expectations.

**Test scenarios:**
- Happy path: authenticated admin looks up a valid Discogs seller with no Store or Waitlist record and receives a creatable preview with seller name/avatar when available.
- Happy path: lookup delegates to `DiscogsSellerLookup` rather than duplicating Discogs client behavior in the controller.
- Error path: unauthenticated lookup request returns unauthorized.
- Error path: invalid username returns a non-creatable invalid state and does not query Store/Waitlist as if it were valid.
- Error path: Discogs API error returns a non-creatable lookup-error state and does not show a confirm action.
- Edge case: username matching an existing Store returns an already-active state with enough data for the dashboard to block duplicate onboarding.
- Edge case: username matching an existing Waitlist returns an existing-applicant state and blocks direct creation.
- Integration: public lookup response shape remains unchanged for existing request specs.
- Covers AE1: valid seller with no Store/Waitlist can reach preview state.
- Covers AE2: existing active store blocks duplicate onboarding.
- Covers AE3: existing applicant blocks direct creation.

**Verification:**
- Admin lookup request specs cover auth, seller lookup reuse, duplicate/applicant checks, and failure states.
- Existing public Discogs lookup specs still pass without requiring new admin-only fields.

---

### U2. Direct Admin Onboarding Confirmation

**Goal:** Add the admin confirmation action that creates a store from a verified username using the existing onboarding operation.

**Requirements:** R6, R7, R8, R9, R11; F2; AE4

**Dependencies:** U1

**Files:**
- Modify: `app/controllers/admin/onboardings_controller.rb`
- Modify: `config/routes.rb`
- Modify: `spec/requests/admin/onboardings_spec.rb`
- Modify if needed: `app/services/store_onboarding.rb`
- Modify if needed: `spec/services/store_onboarding_spec.rb`

**Approach:**
- Keep the existing applicant onboarding route and behavior intact.
- Add a separate admin-created onboarding route that accepts a Discogs username from a confirmed preview state.
- Before calling `StoreOnboarding`, re-check for duplicate Store and existing Waitlist records server-side; do not trust the previous lookup response as authorization to create.
- Call `StoreOnboarding` with the username and no waitlist for admin-sourced stores.
- Redirect back to `/admin` with flash notice or alert so success/failure is visible in the existing dashboard flash area.
- Let the dashboard presenter place the newly created store in active stores with the current processing/health behavior.

**Patterns to follow:**
- Existing `Admin::OnboardingsController#create` applicant flow.
- `StoreOnboarding` service behavior and tests.
- Rails redirect + flash pattern already used by applicant onboarding.

**Test scenarios:**
- Happy path: authenticated admin posts a verified username, `StoreOnboarding` is called with that username and no waitlist, and the response redirects to `/admin` with a success notice.
- Happy path: applicant onboarding still calls `StoreOnboarding` with the waitlist object.
- Error path: unauthenticated direct onboarding request returns unauthorized.
- Error path: existing Store blocks direct onboarding and does not call `StoreOnboarding`.
- Error path: existing Waitlist blocks direct onboarding and does not call `StoreOnboarding`.
- Error path: `StoreOnboarding::Error` redirects to `/admin` with an alert.
- Edge case: blank username redirects with an alert and does not call onboarding.
- Integration: after a real `StoreOnboarding` call creates a store, dashboard presenter excludes any matching applicant through existing filtering.
- Covers AE4: confirmation queues onboarding without running full sync/enrichment inline and returns the dashboard to a processing store state.

**Verification:**
- Applicant approval request specs still pass unchanged or with only route-name updates.
- Direct admin onboarding specs prove duplicate/applicant guards run at confirmation time, not only lookup time.

---

### U3. Dashboard Props and Types for Admin Lookup

**Goal:** Provide the frontend with any static URLs or metadata needed to submit lookup and confirmation actions without hard-coding brittle assumptions in multiple places.

**Requirements:** R1, R5, R10, R11, R12; F1, F2

**Dependencies:** U1, U2

**Files:**
- Modify: `app/presenters/admin/dashboard_presenter.rb`
- Modify: `spec/presenters/admin/dashboard_presenter_spec.rb`
- Modify: `app/frontend/types/inertia.ts`
- Modify if needed: `app/frontend/test/pages/page_smoke.test.tsx`

**Approach:**
- Extend admin dashboard props with a small lookup/onboarding config if the frontend needs URLs or CSRF-relevant action targets beyond what Rails forms already provide.
- Keep this prop small and operational: it should not preload lookup results or duplicate active store/applicant collections.
- Preserve existing `active_stores`, `applicants`, `notice`, and `alert` props so current dashboard tests and page smoke tests remain meaningful.
- Type the lookup response states in frontend TypeScript close to the admin dashboard page or shared Inertia types, depending on reuse.

**Patterns to follow:**
- Existing `Admin::DashboardPresenter#props`.
- Existing `AdminDashboardProps`, `AdminStoreSummary`, and `AdminApplicantSummary` types.
- Page smoke test fixtures in `app/frontend/test/pages/page_smoke.test.tsx`.

**Test scenarios:**
- Happy path: dashboard presenter still returns active stores and applicants with existing fields.
- Happy path: new lookup/onboarding config, if added, contains only stable admin action data needed by the page.
- Edge case: empty active stores/applicants still produce renderable props.
- Integration: TypeScript fixtures compile with the updated prop shape.

**Verification:**
- Presenter specs and frontend tests agree on the admin prop contract.
- No public storefront or application page types need changes for admin-only data.

---

### U4. Admin Dashboard Lookup and Preview UI

**Goal:** Add the inline admin panel for username entry, lookup state, minimal preview, duplicate/applicant blocking, and confirmation submission.

**Requirements:** R1, R3, R4, R5, R6, R10, R11, R12; F1, F2; AE1, AE2, AE3, AE5

**Dependencies:** U1, U2, U3

**Files:**
- Modify: `app/frontend/pages/admin/dashboard.tsx`
- Modify: `app/frontend/test/pages/admin_dashboard.test.tsx`
- Modify if needed: `app/frontend/types/inertia.ts`
- Modify if needed: `app/frontend/components/ui/button.tsx`

**Approach:**
- Add a compact operational panel near the top of `/admin` where the operator enters a Discogs username.
- On lookup submit, fetch the admin lookup route and render one of the explicit states: loading, creatable preview, invalid/not found, API error, already active, or existing applicant.
- Show only basic seller identity in the success preview: normalized username, seller display name, and avatar if available.
- Render the create/onboard action only for the creatable preview state.
- Submit confirmation through a Rails form or equivalent CSRF-safe mechanism to the direct admin onboarding route.
- Keep the applicant onboarding cards unchanged.
- Use existing local UI primitives and Tailwind token classes; avoid a modal/wizard unless implementation reveals inline layout is unworkable.
- Ensure mobile layout keeps input, state message, and action buttons readable without horizontal scrolling.

**Patterns to follow:**
- Existing applicant onboarding form in `ApplicantCard`.
- Existing dashboard flash rendering.
- Existing local `Button`, `Card`, `CardHeader`, `CardContent`, and `SectionHeader` primitives.
- `stores/invitation.tsx` for client-side lookup state shape, but do not copy its marketing UI or public copy.
- `renderWithTier` pattern for compact/wide coverage.

**Test scenarios:**
- Happy path: dashboard renders the admin-created storefront panel with a username input and lookup button.
- Happy path: successful creatable lookup renders seller name, username, optional avatar, and a separate confirm/onboard action.
- Happy path: confirm action form posts the looked-up username to the direct admin onboarding route with authenticity token when available.
- Error path: invalid/not-found lookup state renders a blocking message and no confirm action.
- Error path: API-error lookup state renders a retryable or non-creatable error message and no confirm action.
- Edge case: existing active store state blocks confirm action and points the operator toward the active store context.
- Edge case: existing applicant state blocks confirm action and points the operator toward the applicant path.
- Edge case: changing the username after a preview clears stale preview/confirmation state before a new lookup succeeds.
- Integration: applicant onboarding cards and existing active-store cards still render as before.
- Responsive: compact and wide tiers both render the lookup panel, preview state, and applicant onboarding controls without losing content.
- Covers AE1: valid seller lookup produces minimal preview and separate confirmation action.
- Covers AE2: active store duplicate blocks onboarding in the UI.
- Covers AE3: existing applicant blocks direct onboarding in the UI.
- Covers AE5: preview shows only basic identity, not inventory, notes, or application-style fields.

**Verification:**
- Frontend tests cover each lookup state with mocked `fetch`.
- Existing admin dashboard tests continue to prove active stores, applicants, flash messages, and responsive content.

---

### U5. End-to-End Request and Regression Coverage

**Goal:** Tie the new flow together with focused integration coverage and protect existing applicant/public lookup behavior.

**Requirements:** R2, R7, R8, R9, R11, R12; F1, F2; AE1-AE5

**Dependencies:** U1, U2, U3, U4

**Files:**
- Modify: `spec/requests/admin/dashboard_spec.rb`
- Modify: `spec/requests/admin/onboardings_spec.rb`
- Modify: `spec/requests/discogs_lookup_spec.rb`
- Modify: `spec/services/store_onboarding_spec.rb`
- Modify: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- Add cross-layer request assertions only where unit tests cannot prove behavior: admin auth, redirect/flash, duplicate/applicant server guards, and public lookup contract preservation.
- Keep service behavior in service specs and UI state behavior in frontend tests.
- Avoid broad system/browser tests unless implementation introduces behavior that cannot be verified through request and component tests.

**Patterns to follow:**
- Existing request specs for admin auth and Inertia props.
- Existing service specs using `instance_double(DiscogsClient)`.
- Existing Vitest tests with React Testing Library.

**Test scenarios:**
- Integration: public Discogs lookup still returns the same fields for found/not found/API-error cases after admin lookup is added.
- Integration: admin lookup plus direct onboarding can create a Store and enqueue `FullStoreSyncJob` without touching Waitlist when no applicant exists.
- Integration: direct onboarding for a username with a Waitlist record is blocked even if the frontend could submit it.
- Integration: applicant approval still works for Waitlist records and remains the intended path for already-applied sellers.
- Regression: dashboard empty states, active store cards, applicant cards, and flash messages still render.
- Regression: compact/wide dashboard test includes the new lookup panel without horizontal-scroll-prone assumptions.

**Verification:**
- The combined request, service, presenter, and frontend test set covers all origin acceptance examples.
- No new test depends on a live Discogs API call.

---

## System-Wide Impact

- **Interaction graph:** `/admin` gains one lookup action and one direct onboarding action; both stay under existing admin HTTP Basic auth. Public unclaimed-slug lookup remains a separate surface.
- **Error propagation:** Discogs lookup errors become non-creatable preview states; onboarding errors remain redirect alerts on `/admin`.
- **State lifecycle risks:** Lookup success is not trusted as final authorization; confirmation re-checks Store/Waitlist state to prevent duplicates or applicant bypass after stale previews.
- **API surface parity:** Public lookup and admin lookup share seller verification but intentionally do not share response responsibilities.
- **Integration coverage:** Request specs should prove admin auth and server-side duplicate/applicant guards; frontend tests should prove the two-step operator flow.
- **Unchanged invariants:** Applicant approval stays available and unchanged; no Waitlist record is created for admin-sourced stores; `StoreOnboarding` remains the single store creation/job enqueue path.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Admin preview gets stale before confirmation | Re-check Store and Waitlist state during the confirmation request. |
| Public lookup accidentally exposes admin state | Keep admin Store/Waitlist checks in an admin controller instead of extending the public API contract. |
| Duplicate onboarding paths diverge | Route applicant approval and direct admin confirmation through `StoreOnboarding`. |
| UI preview grows into an applicant workflow | Limit preview state to basic identity and blocking state; defer notes, inventory, outreach, and CRM features. |
| Discogs API failures confuse operators | Render a non-creatable error state in lookup and preserve redirect alerts for confirmation failures. |

---

## Documentation / Operational Notes

- No external documentation update is required for customers or sellers.
- Internal operator behavior changes: admins can source a store directly from `/admin`, but already-applied sellers should still be onboarded from the applicant list.
- No rollout migration is required; this is additive to the existing admin dashboard and onboarding service.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-17-admin-discogs-storefront-onboarding-requirements.md](../brainstorms/2026-05-17-admin-discogs-storefront-onboarding-requirements.md)
- Related requirements: [docs/brainstorms/2026-05-16-admin-dashboard-workflow-requirements.md](../brainstorms/2026-05-16-admin-dashboard-workflow-requirements.md)
- Existing plan pattern: [docs/plans/2026-05-16-001-feat-admin-dashboard-workflow-plan.md](2026-05-16-001-feat-admin-dashboard-workflow-plan.md)
- Related code: `app/services/discogs_seller_lookup.rb`
- Related code: `app/services/store_onboarding.rb`
- Related code: `app/controllers/admin/onboardings_controller.rb`
- Related code: `app/presenters/admin/dashboard_presenter.rb`
- Related code: `app/frontend/pages/admin/dashboard.tsx`
