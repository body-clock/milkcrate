---
title: "feat: Close storefront mobile hierarchy gaps G1–G5"
type: feat
status: completed
date: 2026-06-01
origin: docs/brainstorms/2026-06-01-storefront-mobile-hierarchy-requirements.md
---

# feat: Close Storefront Mobile Hierarchy Gaps G1–G5

## Summary

Implement the five hierarchy gaps identified in the storefront mobile-first
requirements doc — store-floor section labels, compact record inspection
affordance, pile confirmation signal, Discogs handoff framing, and sync
failure copy. All changes are copy, labeling, affordance, and semantic; no
visual redesign or backend changes.

---

## Problem Frame

The cohesion audit and hierarchy requirements confirmed that Milkcrate's
structural backbone (crate routing, pile persistence, responsive adaptation)
is sound. The gap is that the compact shopper cannot always read the store
floor, record inspection, and handoff transitions clearly. Five specific
hierarchy issues make the product loop feel less cohesive than the code already
supports.

(see origin: `docs/brainstorms/2026-06-01-storefront-mobile-hierarchy-requirements.md`)

---

## Requirements

- R1. Store-floor sections (Wall, Featured, Browse by genre) communicate their
  distinct jobs to a first-time compact shopper through labels and accessible
  names.
- R2. Interactive shelf headers use native `<button>` elements rather than
  `div[role="button"]` for semantic clarity and assistive technology.
- R3. Compact record inspection has a visible affordance that signals the
  Record moment without depending solely on the undisclosed flip interaction.
- R4. Adding a record to the pile produces a system-level confirmation signal
  beyond local button state change.
- R5. Direct Discogs listing links frame the action as a handoff rather than a
  generic external link.
- R6. Sync failure copy does not leak developer operations ("Rails console")
  to shoppers.
- R7. All changes preserve existing responsive behavior — compact, comfy, and
  wide tiers continue to work as specified.

**Origin flows:** Store orientation (Mode 1), Wall (Mode 2), Crate entry
(Mode 3), Record inspection (Mode 5), Pile review (Mode 6), Discogs handoff
(Mode 7).

---

## Scope Boundaries

- No visual redesign — layout, color, spacing, and animation systems are unchanged.
- No backend changes — no model, service, or controller modifications.
- No data-model renames — Discogs integration nouns stay precise at boundaries.
- No pile checkout, reservation, or purchase claims.
- No broader component refactoring beyond what the 5 gaps require.

### Deferred to Follow-Up Work

- **Store-floor visual differentiation:** Once section labels and semantics are in place (U1), define how Wall, Featured, and Genre sections look visually distinct from each other — different card treatments, layout rhythms, spacing, or accent use. This is a design issue that builds on the labeling infrastructure, not a prerequisite for it.
- Stale Discogs "cart" reference in `docs/design.md` (mentioned in G4): separate docs PR.
- RecordCard nested interactive element deep refactor (G2 scopes to affordance addition, not full card architecture rewrite).
- Store-floor visual density changes at wider tiers (outside this hierarchy-labeling scope).

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/contexts/viewport_context.tsx` — three-tier viewport system (compact ≤767px, comfy 768–1023px, wide ≥1024px)
- `app/frontend/components/store_floor.tsx` — renders `PicksShelf`, `FeaturedCratesRow`, `GenreGrid` as sections with no role copy
- `app/frontend/components/crate_shelf.tsx` — interactive variant uses `div[role="button"]` with `tabIndex={0}` and `onKeyDown` on the header wrapper
- `app/frontend/components/crate_section_grid.tsx` — section header is a plain `<span>` for title + count, no role label
- `app/frontend/components/record_card.tsx` — flip interaction via `role="button"` on outer div, back face has `+ Pile` and `Discogs ↗` buttons
- `app/frontend/components/record_details.tsx` — desktop detail panel with `Discogs ↗` ActionLink
- `app/frontend/pages/stores/show.tsx` — sync failure message with "Try running the sync again from the Rails console"
- `app/frontend/components/pile_sheet.tsx` — existing pile trigger in header appears after first add

### Institutional Learnings

- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` — documents the nested button hydration issue and the `div[role="button"]` pattern. Notes: "Any element that needs to be clickable AND contain interactive children must use `role="button"` on a `<div>`, not a `<button>` element."
- The CrateShelf header specifically DOES contain interactive children (the thumbnail `<button>` elements are siblings in the grid below, not nested in the header `div[role="button"]`). The header `div[role="button"]` wraps ONLY the header content (name + count + open label) — it does NOT wrap the thumbnail buttons. This means conversion to a native `<button>` is safe because the header contains no nested interactive elements.
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` — motion token system to respect when adding any animated feedback.

### External References

- WCAG 2.2 AA requires that interactive elements have discernible accessible names. The current `div[role="button"]` approach works but native `<button>` is preferred when nesting isn't required.
- `prefers-reduced-motion` must be respected for any new animations (pile confirmation).

---

## Key Technical Decisions

- **G1 shelf header → native `<button>`**: The CrateShelf interactive header wraps only the header text content (name, count, open label). The thumbnail grid is a sibling element, not nested inside the header. Converting from `div[role="button"]` to a native `<button>` with reset styles is safe and preferred for assistive tech.
- **G2 compact affordance approach**: Add a text hint ("Tap card to inspect") below the active card on compact viewports only. This keeps the card stack as the primary immersive experience while surfacing the hidden flip interaction. The hint auto-hides after the first flip in a session (localStorage flag).
- **G3 pile confirmation signal**: Use a brief animated notification (toast) that appears near the pile trigger in the header when a record is added. Auto-dismisses after ~2s. Respects `prefers-reduced-motion` (instant show/hide without animation). This avoids interrupting browsing flow while closing the feedback loop.
- **G4 Discogs link copy**: Change "Discogs ↗" to "View on Discogs ↗" for compact (shorter) and "View listing on Discogs ↗" for comfy/wide (more space). Add `aria-label` with record title for screen readers.
- **G5 sync failure copy**: Replace developer-facing "Try running the sync again from the Rails console" with shopper-safe "Inventory may be out of date. The store owner has been notified." No backend notification wiring — just copy change.

---

## Open Questions

### Resolved During Planning

- **Should the inspection hint persist or auto-hide?** Auto-hide after first flip. A persistent hint clutters the immersive crate experience once the shopper understands the interaction.
- **Should the pile toast include the record name?** Yes — "Added [title] to pile" gives specific confirmation. Truncate at ~30 chars with ellipsis for long titles.
- **Should section labels be visually prominent or subtle?** Subtle — small text beneath the section title that explains the job. Not a full redesign of the section headers.

### Deferred to Implementation

- Exact animation duration/easing for the pile toast — use existing `springTactile` tokens as starting point, tune in implementation.
- Whether the inspection hint uses a separate localStorage key per store or a global key — implementation-time decision based on session model.

---

## Implementation Units

### U1. Store-floor section labels with role copy

**Goal:** Add descriptive role copy to each store-floor section so a compact
shopper understands what Wall, Featured, and Browse by genre do in the
browsing session.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/store_floor.tsx`
- Modify: `app/frontend/components/crate_section_grid.tsx`
- Modify: `app/frontend/components/featured_crates_row.tsx`
- Modify: `app/frontend/components/genre_grid.tsx`
- Create: `app/frontend/components/store_floor.test.tsx`

**Approach:**
- Add a `description` prop to `CrateSectionGrid` — a short string rendered as
  `<p>` below the section title in smaller, dimmer text.
- `FeaturedCratesRow` passes description: "Curated crates hand-picked by the store"
- `GenreGrid` passes description: "Browse the full collection by genre"
- `StoreFloor` adds a section label to the `PicksShelf` area: "Today's picks —
  the store's taste at a glance" (rendered above or inside the shelf header)
- Add `aria-label` or `aria-describedby` to each section's container `<div>`
  so screen readers announce the section's job
- Add `role="region"` with `aria-label` to each section for landmark navigation

**Patterns to follow:**
- Existing `CrateSectionGrid` header pattern (title + count in a border-b div)
- `mc-section-name` and `mc-section-count` class naming convention

**Test scenarios:**
- Happy path: Store floor renders Wall section with descriptive label text visible
- Happy path: Featured section renders with "Curated crates" description
- Happy path: Genre section renders with "Browse the full collection" description
- Edge case: Empty sections (0 crates) do not render descriptions
- Integration: Each section has `role="region"` with an `aria-label`
- Integration: Screen reader accessible names include both section title and description

**Verification:**
- All three store-floor sections render role copy at compact tier
- `role="region"` landmarks are present with accessible names
- Existing visual layout is preserved (descriptions are additive, not disruptive)

---

### U2. Convert CrateShelf header to native button

**Goal:** Replace the `div[role="button"]` interactive header in CrateShelf
with a native `<button>` element for better semantic clarity and assistive
technology support.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_shelf.tsx`
- Modify: `app/frontend/components/crate_shelf.test.tsx`

**Approach:**
- In `CrateShelfLayout`, when `interactive` is true, render the header content
  inside a native `<button>` element with reset styles (`appearance-none`,
  `bg-transparent`, `border-none`, `w-full`, `text-left`, `cursor-pointer`).
- Remove `role="button"`, `tabIndex`, and custom `onKeyDown` handler from the
  header `<div>` — the native button handles all of this.
- Keep the `onClick` handler and `aria-label` on the button.
- Keep the existing focus-visible ring styles.
- The thumbnail grid remains a sibling to the header, not nested inside the
  button — no button nesting issue.

**Patterns to follow:**
- The `Button` component in `app/frontend/components/ui/button.tsx` for reset
  style conventions
- The established pattern from `viewport-context-responsive-architecture` learning:
  native `<button>` is preferred when no interactive children are nested

**Test scenarios:**
- Happy path: Interactive CrateShelf renders header as a native `<button>` element
- Happy path: Clicking the header button calls `onSelectCrate` with the crate slug
- Happy path: Keyboard Enter/Space on the header button activates selection
- Edge case: Non-interactive CrateShelf renders no button (existing behavior preserved)
- Integration: No `<button>` elements are nested inside other `<button>` elements (extend existing accessibility test)

**Verification:**
- `document.querySelector('[role="button"]')` returns null for the interactive header (it's now a real button)
- Existing CrateShelf visual appearance is unchanged
- Accessibility test for nested buttons continues to pass

---

### U3. Compact record inspection affordance

**Goal:** Add a visible affordance on compact viewports that signals the
Record inspection moment without depending solely on the undisclosed card flip.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_view/card_stack.tsx`
- Create: `app/frontend/components/crate_view/inspection_hint.tsx`
- Create: `app/frontend/components/crate_view/inspection_hint.test.tsx`

**Approach:**
- Create an `InspectionHint` component that renders "Tap card to inspect"
  text below the active card on compact viewports only.
- The hint is visible until the shopper flips a card for the first time in
  this session (tracked via localStorage key, e.g., `mc-flip-discovered`).
- After the first flip, the hint fades out and does not return for that session.
- The hint renders as a `<p>` with `role="status"` so screen readers can
  announce it, but it's not disruptive.
- `CardStack` conditionally renders `InspectionHint` when `isCompact` is true
  and the localStorage flag is not set.
- Respects `prefers-reduced-motion` — if reduced motion is preferred, the hint
  disappears instantly rather than fading.

**Patterns to follow:**
- `GestureHintOverlay` in `app/frontend/components/crate_view/gesture_hint_overlay.tsx`
  — similar pattern of a discoverable hint that disappears after first interaction
- `useReducedMotionContext` for motion preferences

**Test scenarios:**
- Happy path: InspectionHint renders "Tap card to inspect" on compact viewport when localStorage flag is absent
- Happy path: InspectionHint does not render on comfy/wide viewports
- Happy path: After setting the localStorage flag, InspectionHint does not render
- Edge case: Component renders correctly when localStorage is unavailable (SSR/privacy mode) — defaults to showing hint
- Integration: Hint disappears after first card flip interaction in the same session

**Verification:**
- Compact storefront shows inspection affordance text on first visit
- Non-compact viewports (where RecordDetails panel is visible) do not show the hint
- Hint does not reappear after first flip

---

### U4. Pile confirmation signal

**Goal:** Add a system-level confirmation when a record enters the pile,
closing the feedback gap between "I tapped + Pile" and "my pile has this
record."

**Requirements:** R4

**Dependencies:** None

**Files:**
- Create: `app/frontend/components/pile_toast.tsx`
- Create: `app/frontend/components/pile_toast.test.tsx`
- Modify: `app/frontend/contexts/pile_context.tsx`

**Approach:**
- Create a `PileToast` component — a small notification that appears near the
  top of the viewport (below the sticky header) when a record is added.
- Content: "Added [title] to pile" (title truncated at ~30 chars).
- Auto-dismisses after 2 seconds. Respects `prefers-reduced-motion` (no
  slide animation, instant show/hide).
- `PileContext` exposes a `lastAdded` state (the most recent listing added,
  or null). When `addToPile` is called, set `lastAdded` to that listing.
  Clear it after the toast auto-dismisses.
- `PileToast` subscribes to `lastAdded` from context and renders when non-null.
- Mount `PileToast` inside `AppLayoutContent` (after the header, before
  children) so it's available across all modes.
- Uses existing motion tokens (`springTactile`) for enter/exit animation.
- Renders with `role="status"` and `aria-live="polite"` for screen reader
  announcement.

**Patterns to follow:**
- `FeedbackMessage` component in `app/frontend/components/ui/feedback_message.tsx`
  for tone and structure inspiration
- `springTactile` motion token for animation
- `AnimatePresence` from framer-motion for enter/exit

**Test scenarios:**
- Happy path: Adding a record to pile causes PileToast to render with the record title
- Happy path: Toast auto-dismisses after timeout (use fake timers)
- Happy path: Toast renders with `role="status"` and `aria-live="polite"`
- Edge case: Adding a second record while toast is visible replaces the toast content with the new record
- Edge case: Very long titles are truncated with ellipsis
- Error path: If `lastAdded` is null, no toast renders
- Integration: Full flow — add to pile in RecordCard, toast appears, pile trigger appears in header

**Verification:**
- Adding a record from any surface (card back face or RecordDetails panel)
  triggers the toast
- Toast does not persist or block interaction
- Screen readers announce the addition

---

### U5. Discogs handoff link framing

**Goal:** Update direct Discogs listing links to frame the action as a
handoff rather than a generic external link.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/record_card.tsx`
- Modify: `app/frontend/components/record_details.tsx`
- Modify: `app/frontend/components/record_card.test.tsx`

**Approach:**
- In `RecordCard` back face: change link text from "Discogs ↗" to
  "View on Discogs ↗". Add `aria-label` of
  `View listing for [title] on Discogs (opens in new tab)`.
- In `RecordDetails`: change link text from "Discogs ↗" to
  "View listing on Discogs ↗" (more horizontal space available). Add same
  `aria-label` pattern.
- Both links already have `target="_blank"` and `rel="noopener noreferrer"`.
- Keep the `ActionLink` component usage — only change the text content and
  add the `aria-label` prop.

**Patterns to follow:**
- Existing `ActionLink` component API in `app/frontend/components/ui/action.tsx`
- The pile handoff pattern in `PileFooter` which already frames the Discogs
  action with store context

**Test scenarios:**
- Happy path: RecordCard back face renders "View on Discogs ↗" link text
- Happy path: RecordDetails renders "View listing on Discogs ↗" link text
- Happy path: Both links have aria-label including the record title and "(opens in new tab)"
- Edge case: Record with no title uses fallback "this record" in aria-label
- Integration: Links still open in new tab with correct href

**Verification:**
- No instance of bare "Discogs ↗" text remains in record card or details
- Accessible names communicate destination and action clearly
- Existing link behavior (new tab, noopener) is preserved

---

### U6. Sync failure copy cleanup

**Goal:** Replace developer-facing sync failure copy with shopper-safe
language that does not leak internal operations.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Modify: `app/frontend/pages/stores/show.tsx`
- Modify: `app/frontend/test/pages/page_smoke.test.tsx` (or create a targeted test)

**Approach:**
- Replace the string "Try running the sync again from the Rails console" with
  "Inventory may be out of date. The store owner has been notified."
- Keep the `FeedbackMessage` component with `tone="danger"` and the
  `last_sync_error_at` timestamp display.
- No backend notification wiring is added — the copy change is sufficient for
  this scope. Owner notification routing is a separate concern.

**Patterns to follow:**
- Existing `FeedbackMessage` usage in the same file for sync/enrichment states
- Shopper-facing copy style: brief, clear, no jargon

**Test scenarios:**
- Happy path: When `sync_status === "failed"`, the page renders "Inventory may be out of date" text
- Happy path: The text "Rails console" does not appear anywhere in the rendered output
- Edge case: When `last_sync_error_at` is null, the timestamp clause is omitted (existing behavior)

**Verification:**
- No developer-facing language appears in shopper-visible sync failure state
- The `FeedbackMessage` tone and structure remain correct
- Existing page smoke tests continue to pass

---

## System-Wide Impact

- **Interaction graph:** PileContext gains a `lastAdded` state and the toast
  component subscribes to it. No callbacks, middleware, or observers are added
  beyond this local state.
- **Error propagation:** No new error paths introduced. Toast handles edge
  cases (null, long titles) gracefully.
- **State lifecycle risks:** The `lastAdded` state is ephemeral (auto-clears
  after timeout). The localStorage flag for inspection hint is per-browser,
  not per-session — acceptable for a progressive disclosure pattern.
- **API surface parity:** The Discogs link text change applies to both
  RecordCard (compact) and RecordDetails (comfy/wide), maintaining parity.
- **Integration coverage:** U4 (pile toast) crosses PileContext → AppLayout
  → toast component — the integration test verifies the full path.
- **Unchanged invariants:** Card stack drag/swipe behavior, pile sheet
  dialog semantics, focus trapping, crate routing, and all responsive
  layout breakpoints are explicitly unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CrateShelf button conversion breaks existing animation wrappers | The header is NOT inside the motion wrapper — motion is on the outer container. Button conversion only affects the header content div. |
| Inspection hint feels cluttered on small screens | Keep text minimal ("Tap card to inspect"), position below the card stack (not overlaying), auto-hide after first flip. |
| Pile toast interferes with browsing flow | 2s auto-dismiss, positioned non-intrusively below header. Does not block interaction or require dismissal. |
| Section role copy adds visual noise to clean floor | Use `text-xs text-mc-text-dim` — subtle, not prominent. Only adds ~12px of height per section. |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-01-storefront-mobile-hierarchy-requirements.md](docs/brainstorms/2026-06-01-storefront-mobile-hierarchy-requirements.md)
- **Cohesion audit:** [docs/reviews/2026-06-01-storefront-cohesion-audit.md](docs/reviews/2026-06-01-storefront-cohesion-audit.md)
- **Parent plan:** [docs/plans/2026-06-01-001-feat-storefront-experience-language-issues-plan.md](docs/plans/2026-06-01-001-feat-storefront-experience-language-issues-plan.md)
- Related code: `app/frontend/components/store_floor.tsx`, `app/frontend/components/crate_shelf.tsx`, `app/frontend/components/record_card.tsx`
- Related issue: #217 (storefront mobile hierarchy)
- Institutional learning: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
