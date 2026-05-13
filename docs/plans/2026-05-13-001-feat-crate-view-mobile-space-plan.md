---
title: "feat: Tighten CrateView mobile space"
type: feat
status: completed
date: 2026-05-13
origin: docs/brainstorms/2026-05-13-crate-view-mobile-space-requirements.md
---

# feat: Tighten CrateView mobile space

## Summary

Implement the mobile CrateView space pass inside the existing frontend surfaces: compact the mobile header/tabs, make the card stack height responsive to available viewport space, and demote persistent navigation/instruction chrome while keeping swipe/drag and accessible controls intact.

---

## Problem Frame

The origin requirements define a focused mobile CrateView pass: reclaim phone-height currently spent on a large back button, full tab row, fixed stack minimum, large paginator buttons, and permanent gesture instruction copy. The plan keeps the tactile crate stack as the primary browsing metaphor and avoids detail-tray, sheet-switcher, backend, and StoreFloor navigation changes.

---

## Requirements

- R1. Compact/mobile CrateView uses a tighter header instead of a standalone large back button followed by separate visual chrome.
- R2. The compact header preserves an easy-to-hit back control with accessible naming and visible press/focus states.
- R3. The compact header communicates active crate context without making the full horizontal crate list visually dominant.
- R4. Store-floor orientation copy, including store description, does not persist inside CrateView.
- R5. Desktop/tablet CrateView behavior remains unchanged unless explicitly targeted by compact/mobile rules.
- R6. Compact/mobile stack sizing responds to available viewport height instead of relying on a fixed large minimum.
- R7. The active record cover remains the visual center; adaptive sizing must not collapse the stack into a list-like or thumbnail-like experience.
- R8. The progress indicator remains visible and associated with the stack without adding unnecessary vertical spacing.
- R9. Swipe/drag remains the primary mobile record navigation path, with visible controls retained as a secondary path.
- R10. Visible compact/mobile navigation controls use less visual space while preserving reliable touch targets.
- R11. Permanent gesture instruction copy is replaced by a lighter non-persistent affordance.
- R12. The lighter hint must still teach users that dragging/swiping changes records and tapping can reveal card details.

**Origin actors:** A1 Mobile crate browser, A2 Returning mobile browser, A3 Desktop/tablet browser

**Origin flows:** F1 Mobile user enters a crate, F2 Mobile user advances through records, F3 User has learned the gesture

**Origin acceptance examples:** AE1 compact header/no description, AE2 desktop unchanged, AE3 adaptive stack, AE4 accessible visible controls, AE5 non-persistent hint

---

## Scope Boundaries

- Bottom record detail tray is out of scope.
- Bottom-sheet crate or genre switcher is out of scope.
- Major StoreFloor navigation changes are out of scope.
- Backend, curation, and data model changes are out of scope.
- Replacing CrateView with a list, carousel, or non-crate browsing model is out of scope.
- Desktop/tablet redesign is out of scope.
- Full visual redesign of RecordCard is out of scope beyond preserving stack fit.

### Deferred to Follow-Up Work

- Full crate/genre switcher redesign: if the compacted tabs still feel long on mobile, revisit the bottom-sheet switcher from the ideation doc in a separate pass.
- Mobile record detail tray: keep the current flip/details model for now; evaluate a tray only after the space pass is tested on-device.

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/components/crate_view.tsx` owns the mobile/desktop CrateView split, back button, crate tabs, stack sizing, progress bar, paginator controls, and permanent gesture copy.
- `app/frontend/components/crate_tabs.tsx` already encapsulates the tablist and keyboard behavior; this plan should extend its presentation options rather than replacing it with a new switching surface.
- `app/frontend/hooks/use_viewport.ts` exposes `isCompact`, `isComfy`, and `isWide`; CrateView already imports `useViewport` and uses `isCompact` to choose mobile card flip behavior.
- `app/frontend/test/viewport-test-utils.tsx` provides `renderWithTier`, which should be used for compact vs desktop component coverage.
- `app/frontend/pages/stores/featured.tsx` renders store description above StoreFloor and renders CrateView only after a crate opens. No page-level data or store description changes are needed for this pass.

### Institutional Learnings

- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` establishes the viewport provider/test-helper pattern and warns that responsive boolean migrations need explicit compact vs desktop assertions.
- The same learning records that CrateView is the correct larger detail surface after small picks-wall cards route into it; this plan preserves the crate stack and does not move details into a new tray.
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` establishes shared motion/tactile tokens. Any new press or motion behavior should reuse existing tokens rather than inventing local values.

### External References

- External research is not needed for this plan. The work is a small, local frontend layout change with established repo patterns and existing accessibility/touch-target context already captured in the origin ideation and requirements documents.

---

## Key Technical Decisions

- **Keep changes local to CrateView and CrateTabs:** The confirmed scope is a focused CrateView pass, so StoreFloor, AppLayout, curation, and routing stay untouched.
- **Extend the current tabs before replacing them:** The plan compacts or visually demotes the existing crate tab row on mobile. It does not introduce a bottom-sheet switcher.
- **Use compact-tier branching, not browser sniffing:** Existing viewport context already expresses the product's responsive tiers and is testable via `renderWithTier`.
- **Prefer layout constraints over runtime measurement:** Use CSS viewport units and responsive constraints for stack sizing where possible. Runtime measurement is deferred unless implementation proves CSS cannot satisfy the accepted examples.
- **Treat the hint as session-local UI state:** The hint should disappear after successful navigation during the component's lifetime. Persistent storage is deferred to avoid adding carrying cost before user testing proves it is needed.

---

## Open Questions

### Resolved During Planning

- Compact header and tabs strategy: Use the existing tab behavior in a visually compressed/demoted mobile treatment; do not build the sheet switcher in this pass.
- Hint persistence strategy: Dismiss the hint after successful in-session record navigation; do not add localStorage or user preference persistence yet.
- Test scope: Add focused CrateView component coverage rather than expanding broader storefront/mobile plan tests.

### Deferred to Implementation

- Exact stack sizing formula: Choose the final CSS values during implementation and verify against compact, comfy, and wide renders.
- Final icon/text treatment for controls: Pick the concrete labels/icons while implementing, preserving accessible names and touch targets.
- Hint animation treatment: Choose a subtle cue that fits existing motion tokens and reduced-motion behavior.

---

## Implementation Units

### U1. Compact Mobile Header and Tabs

**Goal:** Replace the mobile CrateView top chrome with a compact header that combines back navigation, active crate context, and a visually demoted crate tab row without changing desktop/tablet behavior.

**Requirements:** R1, R2, R3, R4, R5; F1; AE1, AE2

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Modify: `app/frontend/components/crate_tabs.tsx`
- Create: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Split the current back-button rendering into a compact mobile header path and the existing non-compact path.
- In the compact path, render an easy-to-hit back control, active crate name/count, and a lower-emphasis crate tab affordance.
- Extend `CrateTabs` with presentation support for the compact CrateView context while preserving its tablist role, selected state, click behavior, and keyboard handling.
- Keep desktop/tablet markup and spacing as close to current behavior as possible.
- Do not thread store description into CrateView; it already belongs to the store floor in `app/frontend/pages/stores/featured.tsx`.

**Execution note:** Start with compact and desktop rendering tests before changing layout, since the main risk is accidentally regressing one tier while improving the other.

**Patterns to follow:**
- `app/frontend/test/viewport-test-utils.tsx` for tier-specific rendering.
- `app/frontend/components/crate_tabs.tsx` for roving tab selection and keyboard handling.
- Existing focus ring and touch target styling in `app/frontend/components/crate_view.tsx`.

**Test scenarios:**
- Covers AE1. Happy path: given compact tier and an `onBack` handler, CrateView renders a compact header with a back control, active crate name, active crate count or record position context, and no store description text.
- Covers AE2. Happy path: given comfy or wide tier, CrateView still renders the existing desktop/tablet-oriented top behavior and two-column detail area.
- Happy path: clicking the compact back control calls `onBack` exactly once.
- Happy path: selecting another crate through the compacted tabs calls `onSelectCrate` with that crate slug and keeps the active tab semantics.
- Edge case: when `hideTabs` is true, the compact header still provides back and active-crate context without rendering the tab row.
- Accessibility: the compact back control has an accessible name equivalent to returning to the store, and the tablist preserves `role="tablist"`, `role="tab"`, and `aria-selected`.

**Verification:**
- Compact CrateView top chrome is visibly shorter than the prior back-button-plus-tabs stack.
- Desktop/tablet CrateView remains functionally unchanged.
- Existing crate tab keyboard navigation still works.

---

### U2. Adaptive Mobile Stack Sizing

**Goal:** Replace the compact/mobile fixed stack minimum with viewport-aware sizing so the record stack remains dominant without pushing progress and controls unnecessarily below the fold.

**Requirements:** R6, R7, R8; F1, F2; AE3

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Test: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Introduce compact-only stack sizing rules that constrain the stack against available viewport height while preserving a large square cover.
- Keep the current desktop/tablet stack dimensions and detail panel behavior.
- Keep progress visually associated with the stack and reduce unnecessary margins only on compact tier.
- Prefer CSS constraints with viewport-height units and responsive min/max values over JavaScript measurement.
- Validate that the cover remains large enough to feel like the same crate stack, not a reduced thumbnail grid.

**Patterns to follow:**
- Existing `isCompact` branching in `app/frontend/components/crate_view.tsx`.
- Viewport tier test injection from `app/frontend/test/viewport-test-utils.tsx`.
- Existing reduced-motion branches in CrateView for animation behavior.

**Test scenarios:**
- Covers AE3. Happy path: given compact tier, the stack container uses compact-specific sizing rather than the desktop fixed minimum.
- Covers AE2. Happy path: given wide tier, the desktop stack minimum and desktop detail panel behavior remain present.
- Edge case: given a crate with one record, adaptive sizing still renders the active record and progress indicator without relying on hidden neighbor cards.
- Edge case: given an empty crate, the empty state still renders back/header affordances and does not attempt stack sizing against missing records.
- Accessibility: the progressbar remains present with correct `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and accessible label after layout changes.

**Verification:**
- On compact viewport, the stack, progress, and controls fit more efficiently in the first viewport than the current fixed-min-height layout.
- On wide viewport, existing desktop CrateView proportions and detail panel remain stable.

---

### U3. Compact Controls and Non-Persistent Gesture Hint

**Goal:** Keep swipe/drag as the primary mobile record navigation interaction while reducing the visual footprint of secondary controls and replacing permanent instruction text with a lighter dismissing cue.

**Requirements:** R9, R10, R11, R12; F2, F3; AE4, AE5

**Dependencies:** U2

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Test: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- On compact tier, reduce the visual weight of previous/next controls while maintaining reliable hit regions, disabled states, focus rings, and accessible names.
- Keep desktop/tablet paginator controls unchanged unless shared extraction makes a no-op refactor unavoidable.
- Track whether the user has successfully navigated during the current CrateView lifetime and use that to hide or demote the gesture hint.
- Hide the hint after button navigation and drag/swipe navigation, because both prove the user can move through records.
- Respect reduced-motion preferences for any hint movement or card nudge.

**Patterns to follow:**
- Existing `navigate` function and `direction` ref in `app/frontend/components/crate_view.tsx`.
- Existing Framer Motion press token usage: `SCALE_PRESS` and `springPress`.
- Existing reduced-motion handling in CrateView.

**Test scenarios:**
- Covers AE4. Happy path: given compact tier, clicking visible next/previous controls still advances and reverses records, with disabled behavior at crate boundaries.
- Covers AE5. Happy path: given compact tier before navigation, the lightweight gesture cue is present; after successful next/previous navigation, the cue no longer occupies permanent layout space.
- Happy path: after drag/swipe navigation crosses the threshold, the hint is dismissed as it would be after button navigation.
- Edge case: attempting to navigate past the first or last record does not dismiss the hint unless navigation actually succeeds.
- Accessibility: visible controls retain accessible names for previous and next record and remain keyboard/focus reachable.
- Reduced motion: the hint has a non-animated or reduced-motion-safe presentation when reduced motion is active.

**Verification:**
- Compact controls consume less visual space than the existing two large circular buttons and permanent instruction line.
- Gesture discovery still exists for first-time users.
- Record navigation behavior and keyboard arrow navigation continue to work.

---

## System-Wide Impact

- **Interaction graph:** CrateView remains the only changed user-facing component; StoreFloor opens it as before, and AppLayout remains untouched.
- **Error propagation:** No new error paths or network requests are introduced.
- **State lifecycle risks:** New hint-dismissal state should reset naturally when CrateView remounts or the active crate changes unless implementation chooses a more deliberate in-session scope.
- **API surface parity:** No backend or Inertia prop changes are planned.
- **Integration coverage:** Component tests should cover compact and desktop render differences; visual browser verification should cover actual phone-height constraints.
- **Unchanged invariants:** Crate selection, record order, pile behavior, Discogs links, desktop details panel, and StoreFloor description behavior remain unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Compacting the header makes back navigation less obvious | Preserve accessible name, visible icon treatment, focus ring, and a minimum reliable hit region. |
| Adaptive stack formula looks good in jsdom tests but poor on real devices | Include manual/browser verification on small phone, large phone, and desktop widths after implementation. |
| Demoted controls hurt discoverability | Keep a first-use hint and visible secondary controls; dismiss only after successful navigation. |
| Crate tabs remain long even after visual demotion | Treat this as accepted for this pass; the sheet switcher is explicitly deferred for follow-up work. |

---

## Documentation / Operational Notes

- No user-facing documentation, backend rollout, or operational monitoring changes are required.
- If implementation reveals that compacted tabs still dominate mobile space, document that as follow-up rather than expanding this plan into the deferred switcher sheet.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-13-crate-view-mobile-space-requirements.md](../brainstorms/2026-05-13-crate-view-mobile-space-requirements.md)
- **Ideation document:** [docs/ideation/2026-05-13-crate-view-mobile-space-ideation.md](../ideation/2026-05-13-crate-view-mobile-space-ideation.md)
- Related code: `app/frontend/components/crate_view.tsx`
- Related code: `app/frontend/components/crate_tabs.tsx`
- Related tests: `app/frontend/test/viewport-test-utils.tsx`
- Related learning: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- Related learning: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
