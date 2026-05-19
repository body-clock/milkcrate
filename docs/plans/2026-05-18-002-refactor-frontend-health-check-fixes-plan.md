---
title: "refactor: Frontend health check fixes"
type: refactor
status: completed
date: 2026-05-18
origin: docs/solutions/ (N/A — sourced from holistic code review findings)
---

# refactor: Frontend health check fixes

## Summary

Targeted cleanup of the 18 P0-P1 findings from a holistic frontend health check — type safety fixes, dead CSS removal, price formatting unification, CrateView decomposition, CrateCard/CrateShelf deduplication, three small correctness fixes, and critical test coverage for PileSheet, CrateCard, RecordCard, and useTheme.

---

## Problem Frame

A holistic review of `app/frontend/` (65 files, ~9,350 lines) identified 42 findings across type safety, maintainability, and testing. The 18 P0-P1 findings represent: type-unsafe casts that silently corrupt at runtime, ~200 lines of dead CSS shipping to every user, a 549-line God component resisting maintenance, duplicated component logic with split currency support, and zero test coverage on four interactive surfaces where regressions would break core UX (pile management, card flip, crate browsing, theme toggle).

---

## Requirements

- R1. Eliminate `as any` and unsafe `as Theme` casts — all page props and localStorage reads must be validated before use
- R2. Remove all unused CSS class definitions from `app/assets/tailwind/application.css`
- R3. Centralize price formatting into a single shared utility, eliminating the `$`-hardcoding in RecordCard and PileSheet
- R4. Decompose `crate_view.tsx` by extracting `RecordDetails`, `preloadImage`, and `usePreload` into their own modules
- R5. Eliminate the ~60% structural duplication between CrateCard and CrateShelf
- R6. Prevent CrateView's Arrow key handler from firing when focus is in form elements or a modal is open
- R7. Restore the previously-viewed crate when navigating back to a store page
- R8. Surface HTTP error status from the invitation Discogs lookup instead of silently treating all failures as "page available"
- R9. Add comprehensive tests for PileSheet (confirmClear flow, total calculation, record removal, focus management, responsive layout)
- R10. Add comprehensive tests for CrateCard (hover animation states, keyboard navigation, empty state, thumbnail click indexing)
- R11. Add comprehensive tests for RecordCard (flip mechanics, drag suppression, disableFlip and framed props, back-face content, pile toggle)
- R12. Add tests for useTheme (localStorage persistence, SSR fallback, toggle, DOM attribute side effects)

---

## Scope Boundaries

- P2/P3 findings (24 items: import path standardization, UI component adoption across pages, spinner extraction, test factory dedup, focus-ring utility, localStorage key naming, motion token CSS/TS split, admin CSRF token centralization, AnimatedSection extraction, lib test runner migration, smoke test quality) — deferred to follow-up
- Backend changes to support typed Inertia page props (e.g., Rails-side shared props interface) — deferred; the plan fixes the frontend side only
- CSS architectural changes beyond dead-code removal (e.g., Tailwind v4 migration of `@theme` to `@layer`, consolidation of `.mc-input` duplicate rules) — deferred

### Deferred to Follow-Up Work

- P2/P3 finding fixes: separate cleanup pass after this plan lands (filed as follow-up issue)
- Lib test migration from `node:test` → `vitest`: 4 test files need conversion
- Test data factory extraction: `makeListing`/`makeCrate` dedup across 7 files

---

## Context & Research

### Relevant Code and Patterns

- **MilkcrateShell slot-based decomposition** (`app/frontend/layouts/milkcrate_shell.tsx`): thin shared shell contract where each consumer passes header/footer/content through slot props. Reference pattern for CrateView decomposition.
- **Context → Hook → Component layering**: `PileContext` wraps `usePile()`; `ViewportContext` wraps `useViewport()`. New extracted hooks follow this pattern.
- **`renderWithTier()`** (`app/frontend/test/viewport-test-utils.tsx`): injects a fixed viewport tier in tests without `matchMedia` mocking. Tests for interactive components use this plus `describe.each(tiers)`.
- **`makeListing()` / `makeCrate()`** test data factories: co-located in test files. Pattern for new test files.
- **Pure-library pattern** (`app/frontend/lib/`): zero-dependency pure functions — no React, no DOM, no Framer Motion. `preloadImage` follows this.
- **Currency-aware formatting** in `crate_view.tsx:77` (RecordDetails): ternary on `listing.currency` for £/€/$. Reference for unified utility.
- **Accessibility test** (`app/frontend/components/accessibility.test.tsx`): checks for nested-button violations across primitives. Pattern to extend for new interactive components.

### Institutional Learnings

- **Guard-parity audit** (`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`): When splitting a single render path into responsive branches, guard conditions like `!hideTabs` are easily replicated to one branch and dropped from the other. CrateView decomposition must audit every guard across both compact and wide branches.
- **ViewportContext testing conventions** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): nested-button trap — any clickable wrapper around interactive children must use `role="button"` on a `<div>`, never `<button>` or `motion.button`. New components must pass the accessibility test.
- **Vendor-brand surface system** (`docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`): three-layer decomposition pattern (identity → layout → content), guard-parity audit checklist, cross-surface responsive test matrix.
- **Animation token centralization** (`docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`): token pruning must search production code before deletion, keep tokens with active consumers, update tests to describe current API surface.
- **Crate strategies meta-pattern** (`docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`): extract a shared interface from duplicated implementations — the same shape as CrateCard→CrateShelf dedup.

### Prior Completed Work

A previous cleanup plan (`docs/plans/2026-05-18-001-refactor-frontend-unused-code-cleanup-plan.md`, status: **completed**) already removed `TactileCard`/`StorefrontPreview` components, pruned unused motion token exports, retired the `mc-dig-session` legacy localStorage migration key, and enabled TypeScript unused-code compiler checks. This plan's dead-CSS work (R2) builds on that foundation. Component consolidation (R5) was explicitly deferred there.

---

## Key Technical Decisions

- **CrateView decomposition extracts 3 modules, not 6**: RecordDetails (component), preloadImage + usePreload (lib + hook), plus a future CrateStack and CrateControls deferred. The 3 extractions are self-contained and independently testable; the remaining card-stack and paginator blocks are more coupled and riskier to extract without a broader refactor.
- **CrateCard wraps CrateShelf, not shared base**: CrateShelf is already the more configurable component (supports both `interactive`/non-interactive modes, configurable `previewCount`, `openLabel`). CrateCard becomes a thin Framer Motion wrapper around `<CrateShelf interactive ... />` that adds the tactile hover animations. This avoids introducing a third abstraction layer.
- **Price utility prefers `display_price`**: When the backend provides `listing.display_price`, the utility returns it directly (it's already formatted). Falls back to `parseFloat(price).toFixed(2)` with currency symbol detection. This preserves the backend's ability to pre-format while fixing the client-side `$`-only hardcoding.
- **Tests written against current interfaces, not extracted ones**: Test units (U9-U12) test the public component/hook API as it exists today. Extractions (U4, U5) re-export through the original paths. This keeps tests stable across the refactor.
- **No shared Inertia PageProps type created**: The `as any` fix replaces the cast with a narrow local interface rather than introducing a cross-cutting shared type. A proper shared PageProps type requires Rails-side coordination (the server decides what props exist) — deferred.

---

## Open Questions

### Deferred to Implementation

- **`CrateCard` test interaction with `useTactileHover`**: Proximity-based hover states are hard to unit-test without mocking pointer events carefully. The plan calls for testing animation `animate` target values (scale, y, rotate, borderColor) rather than proximity internals.
- **`RecordCard` drag suppression test precision**: The 8px `Math.hypot` threshold is implementation-specific. Tests assert "click after substantial pointer movement does not flip" rather than testing exact pixel values.
- **CrateView Arrow key guard exact focus check**: Whether to use `instanceof HTMLInputElement` or `e.target.closest('input, textarea, select, [contenteditable]')` depends on which surface the focus is actually on at runtime. Defer to implementation to choose the right DOM check.

---

## Implementation Units

### U1. Type Safety Fixes

**Goal:** Replace unsafe type casts in app_layout and use_theme with validated types.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `app/frontend/layouts/app_layout.tsx`
- Modify: `app/frontend/hooks/use_theme.ts`
- Test: `app/frontend/hooks/use_theme.test.ts` (created in U9)

**Approach:**
- `app_layout.tsx`: Replace `const props = page.props as any` with a narrow `AppLayoutProps` interface (`{ notice?: string; store?: { name?: string; discogs_username?: string } }`). Remove the individual `as string | undefined` casts on lines 15-17.
- `use_theme.ts`: Replace `localStorage.getItem("mc-theme") as Theme` with a validated read: `const stored = localStorage.getItem("mc-theme"); return stored === "light" ? "light" : "dark"`.

**Patterns to follow:**
- Existing typed props pattern in pages (e.g., `stores/show.tsx` accepts `StoreShowProps`)

**Test scenarios:**
- Happy path: `AppLayout` renders with typed props matching interface — no runtime casts
- Happy path: `useTheme` returns `"dark"` when localStorage has no value, `"light"` when stored value is `"light"` (tested in U9)
- Edge case: `useTheme` returns `"dark"` when localStorage contains `"blue"`, `null`, or any non-`"light"` value (tested in U9)
- Edge case: `useTheme` returns `"dark"` in SSR context (tested in U9)

**Verification:**
- No `as any` cast remains in `app_layout.tsx`
- No unsafe `as Theme` cast remains in `use_theme.ts`
- Existing tests pass unchanged

---

### U2. Dead CSS Removal

**Goal:** Remove legacy CSS class definitions no longer referenced by any React component.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Modify: `app/assets/tailwind/application.css`

**Approach:**
- Remove legacy Dig View classes (`.mc-dig-view`, `.mc-dig-stack`, `.mc-dig-slot`, `.mc-dig-nav`, `.mc-dig-nav-btn`, `.mc-dig-counter`, `.mc-dig-hint` — ~50 lines, lines ~247-297)
- Remove component classes replaced by React rewrite: `.mc-record-card`, `.mc-record-card-inner`, `.mc-record-front`, `.mc-record-back` and all back-face sub-classes, `.mc-pile-list`, `.mc-pile-item`, `.mc-pile-thumb`, `.mc-pile-info`, `.mc-pile-title`, `.mc-pile-artist`, `.mc-pile-price`, `.mc-crate-row`, `.mc-sections`, `.mc-section-browse`, `.mc-accent-link`, `.mc-session-bar` — ~150 lines
- Before deleting any class, grep `app/` (excluding `.css` files) to confirm zero non-CSS references
- Keep CSS custom properties (`--mc-*`) and active utility classes (`.mc-btn`, `.mc-input`, `.mc-header`, etc.)

**Patterns to follow:**
- Reference-verified deletion pattern from prior cleanup plan (`docs/plans/2026-05-18-001-refactor-frontend-unused-code-cleanup-plan.md` U2/U3)

**Test scenarios:**
- Test expectation: none — pure CSS removal; existing visual regression is covered by component tests. Confirm zero grep matches for each deleted class across `app/` excluding `.css`.

**Verification:**
- All deleted class names return zero grep matches in `app/` (excluding `.css` files)
- `npm run test:components` passes (no CSS-dependent test breakage)
- Visual inspection: storefront, admin dashboard render without layout breakage

---

### U3. Price Formatting Utility

**Goal:** Create a shared `formatPrice` utility and replace all 6 inline price formatting call sites.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Create: `app/frontend/lib/format_price.ts`
- Test: `app/frontend/lib/format_price.test.ts`
- Modify: `app/frontend/components/crate_view.tsx` (RecordDetails, line 77)
- Modify: `app/frontend/components/record_card.tsx` (line 142)
- Modify: `app/frontend/components/pile_sheet.tsx` (lines 19, 151, 173)

**Approach:**
- Export `formatPrice(listing: Listing): string`: returns `listing.display_price` when present, otherwise `parseFloat(listing.price).toFixed(2)` with currency symbol detection (£ for GBP, € for EUR, $ otherwise). Returns `"—"` for missing/null price.
- Export `formatPriceValue(price: string | null | undefined): string`: same logic without the `display_price` fallback, for PileSheet's reduce loop.
- Replace inline formatting at all 6 call sites.
- The `Listing` type already has `display_price?: string` — use it.

**Patterns to follow:**
- Pure-library pattern: zero React/DOM/Framer Motion imports
- Currency detection from `crate_view.tsx:50` (existing ternary)

**Test scenarios:**
- Happy path: `formatPrice({ price: "10.00", currency: "USD" })` → `"$10.00"`
- Happy path: `formatPrice({ price: "10.00", currency: "GBP" })` → `"£10.00"`
- Happy path: `formatPrice({ price: "10.00", currency: "EUR" })` → `"€10.00"`
- Happy path: `formatPrice({ display_price: "~$10", price: "10.00", currency: "USD" })` → `"~$10"` (display_price wins)
- Edge case: `formatPrice({ price: null, currency: "USD" })` → `"—"`
- Edge case: `formatPrice({ price: "0.00", currency: "USD" })` → `"$0.00"`
- Edge case: `formatPriceValue("0")` → `"$0.00"`, `formatPriceValue(null)` → `"—"`

**Verification:**
- All 6 call sites use the shared utility
- RecordCard and PileSheet no longer hardcode `$`
- `npm run test:frontend` passes for the new test file

---

### U4. CrateView Decomposition

**Goal:** Extract `RecordDetails` component and `preloadImage`/`usePreload` from `crate_view.tsx` into their own modules.

**Requirements:** R4

**Dependencies:** U3 (price utility available for RecordDetails)

**Files:**
- Create: `app/frontend/components/record_details.tsx`
- Create: `app/frontend/lib/preload_images.ts`
- Create: `app/frontend/hooks/use_preload.ts`
- Modify: `app/frontend/components/crate_view.tsx` (reduce from 549 to ~420 lines)
- Test: `app/frontend/components/record_details.test.tsx` (optional smoke; full integration coverage from existing CrateView tests)

**Approach:**
- `RecordDetails`: Move lines 40-104 from `crate_view.tsx` into `components/record_details.tsx`. Export as default. Import in `crate_view.tsx`. Props: `listing: Listing`, `direction: RiffleDirection`. The component uses `usePileContext()` and `AnimatePresence` + `motion.div` — these imports move with it.
- `preloadImage`: Move lines 106-119 into `lib/preload_images.ts` as a named export. Pure DOM utility — no React imports.
- `usePreload`: Move lines 121-163 into `hooks/use_preload.ts` as a named export. Depends on `preloadImage` from the lib module.
- After extraction, run a guard-parity audit on `crate_view.tsx`: verify all conditionals (`!hideTabs`, `total > 0`, `isCompact`, `activeRecord`, `!activeCrate`) still guard every responsive branch.

**Patterns to follow:**
- MilkcrateShell slot-based decomposition: narrow contract as props
- `RecordDetails` uses `usePileContext()` — consumer handles context boundary (pattern from `PileSheet`)

**Test scenarios:**
- Happy path: Existing `crate_view.test.tsx` tests all pass after extraction — RecordDetails behavior tested through CrateView integration
- Edge case: All guard conditions verified across compact and wide branches (guard-parity audit checklist)

**Verification:**
- `crate_view.tsx` is under 450 lines
- `npm run test:components` passes — existing CrateView tests pass without modification
- No dead imports remain in `crate_view.tsx`

---

### U5. CrateCard/CrateShelf Deduplication

**Goal:** Rewrite CrateCard as a thin Framer Motion wrapper around CrateShelf, eliminating ~80 lines of duplicated layout, keyboard handling, and empty-state logic.

**Requirements:** R5

**Dependencies:** U4 (establishes extraction pattern)

**Files:**
- Modify: `app/frontend/components/crate_card.tsx`
- Modify: `app/frontend/components/crate_shelf.tsx` (minor — may need to expose inner components or props)
- Test: `app/frontend/components/crate_card.test.tsx` (created in U12 — can verify wrapper behavior)

**Approach:**
- CrateCard renders `<CrateShelf interactive openLabel="DIG →" previewCount={4} ... />` inside a `motion.div` that applies the tactile hover animations (borderColor, scale, y, rotate).
- The tactile hover handlers from `useTactileHover` spread onto the outer motion.div wrapper.
- The inner thumbnail grid's `innerHoverScale` animation is preserved via CrateShelf's existing inner hover behavior or by passing a `className`/style prop.
- Empty state (`records.length === 0`): CrateShelf already handles this. CrateCard delegates.
- Variant (`featured` vs `genre`): passed as `headerSize` or similar prop to CrateShelf, or handled by CrateCard wrapping CrateShelf's header.
- Delete duplicated code from CrateCard: header layout, thumbnail grid, keyboard handling, empty state, aria-label pattern.

**Test scenarios:**
- Covers tests defined in U12 (CrateCard test unit)

**Verification:**
- CrateCard is under 60 lines (down from ~116)
- `npm run test:components` passes — existing integration tests (storefront_shell.test.tsx) still work
- CrateCard and CrateShelf produce identical DOM structure (header + grid + thumbnails) for the same crate data
- Visual: FeaturedCratesRow and GenreGrid render identically before and after refactor

---

### U6. CrateView Keydown Guarding

**Goal:** Prevent CrateView's global Arrow key handler from intercepting keystrokes meant for form inputs, textareas, or open modals.

**Requirements:** R6

**Dependencies:** None (U4 modifies the same file but the guard is a 3-line addition — order-independent)

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`

**Approach:**
- At the top of `handleKeyDown`, add a guard: skip when `e.target` is an `HTMLInputElement`, `HTMLTextAreaElement`, `HTMLSelectElement`, or has `isContentEditable`.
- Also skip when `document.querySelector('[role="dialog"][aria-modal="true"]')` is present (PileSheet or other modals).
- The guard fires before the `direction` resolution and `navigate` call.

**Test scenarios:**
- Happy path: ArrowDown/ArrowUp navigates crate when no input is focused
- Edge case: ArrowDown does NOT navigate when an `<input>` is focused
- Edge case: ArrowDown does NOT navigate when a `<textarea>` is focused
- Integration: ArrowUp does NOT navigate when PileSheet modal is open (`role="dialog"` with `aria-modal="true"`)

**Verification:**
- Keyboard navigation still works in normal crate browsing
- Arrow keys in PileSheet modal do not change the background crate's active record
- Arrow keys in the admin dashboard search input do not trigger crate navigation

---

### U7. StoreShow History Restoration

**Goal:** Restore the previously-viewed crate when the user navigates back to a store page via browser back.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Modify: `app/frontend/pages/stores/show.tsx`

**Approach:**
- Change `useState<string | null>(null)` to `useState<string | null>(() => history.state?.crateSlug ?? null)`.
- Change `useState(0)` to `useState(() => history.state?.startIndex ?? 0)`.
- The existing `popstate` listener already handles forward/back events after initial render — this fix covers the initial mount case.

**Test scenarios:**
- Happy path: Browser back from crate view to store page — CrateView renders with the previously-active slug, not StoreFloor
- Edge case: First visit to store page (no history.state) — StoreFloor renders as before
- Edge case: history.state contains `crateSlug` but slug no longer exists in crates — falls through to first crate (existing behavior of `crates.find`)

**Verification:**
- `activeSlug` is restored from `history.state` on initial mount
- Existing navigation behavior (push/replace state, popstate listener) unchanged

---

### U8. Invitation Fetch Error Handling

**Goal:** Distinguish HTTP errors from "seller not found" in the Discogs lookup on the invitation page.

**Requirements:** R8

**Dependencies:** None

**Files:**
- Modify: `app/frontend/pages/stores/invitation.tsx`

**Approach:**
- Add `if (!res.ok) { setProbeState("error"); return }` before `res.json()` in the fetch chain (line ~85-93).
- This prevents a 500/503 HTML response from being passed to `res.json()`, which would throw a `SyntaxError` that gets swallowed into the generic catch.
- The catch clause already sets `probeState` to `"error"` — with this guard, true network errors and 500 responses both surface as error state, while 404 (not found) correctly reaches `res.json()` and sets `"not_found"`.

**Test scenarios:**
- Happy path: 200 response with `{ found: true }` → renders seller name and "Claim this storefront" button
- Error path: 500 response → renders "page available" error state (not a JSON parse crash)
- Error path: 503 response → renders error state (not broken JSON parsing)
- Edge case: Network failure (fetch throws) → renders error state (existing behavior, now more robust)

**Verification:**
- `res.json()` is only called when `res.ok` is true
- Error state is reachable via both network failure and non-200 HTTP status

---

### U9. Test Coverage: useTheme

**Goal:** Add comprehensive tests for the useTheme hook.

**Requirements:** R12

**Dependencies:** U1 (validation fix should land first so tests validate the fixed behavior)

**Files:**
- Create: `app/frontend/hooks/use_theme.test.ts`

**Approach:**
- Use `renderHook` from `@testing-library/react` with `act` for state changes.
- Mock `localStorage` via `vi.stubGlobal` or a per-test setup.
- Test initial state, SSR default, toggle, localStorage persistence, `data-theme` attribute, and invalid value recovery.

**Patterns to follow:**
- Existing hook test patterns in `use_pile.test.ts` and `use_tactile_hover.test.tsx`

**Test scenarios:**
- Happy path: Initial theme defaults to `"dark"` when localStorage has no stored value
- Happy path: Toggle switches `"dark"` → `"light"` → `"dark"`
- Happy path: Toggle writes updated value to localStorage
- Happy path: Toggle sets `document.documentElement.dataset.theme` — `"light"` or empty string
- Edge case: localStorage contains `"light"` → initial theme is `"light"`
- Edge case: localStorage contains `"blue"` → initial theme falls back to `"dark"` (not "blue")
- Edge case: `typeof window === "undefined"` → initial theme is `"dark"` (SSR safety)

**Verification:**
- All test scenarios pass
- `npm run test:components` picks up the new test file

---

### U10. Test Coverage: PileSheet

**Goal:** Add comprehensive tests for PileSheet — dialog mechanics, confirmClear flow, total calculation, record actions, and responsive layout.

**Requirements:** R9

**Dependencies:** U3 (price formatting utility available for total calculation tests)

**Files:**
- Create: `app/frontend/components/pile_sheet.test.tsx`

**Approach:**
- Wrap PileSheet in `PileProvider` + `ViewportProvider` (or `renderWithTier`).
- Use `userEvent` for click interactions (open, close, clear confirmation).
- Test the confirmClear two-step flow (Clear → "Sure? Yes/No" → clearPile or cancel).
- Test total price calculation with multiple records.
- Test individual record removal.
- Test responsive layout variants (compact bottom-sheet vs desktop side-panel).
- Test accessibility: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape key, focus management.

**Patterns to follow:**
- Existing PileSheet test in `accessibility.test.tsx:85` (Escape key) — extend this pattern
- `renderWithTier` for responsive layout tests

**Test scenarios:**
- Happy path: Records render with cover art, title, artist, and price
- Happy path: Individual record remove button calls `removeFromPile`
- Happy path: Total price displays sum of all pile record prices
- Happy path: Empty pile shows "No records in your pile yet."
- Edge case: confirmClear: "Clear" → shows "Sure? Yes/No" → "No" returns to "Clear" button
- Edge case: confirmClear: "Clear" → shows "Sure? Yes/No" → "Yes" calls `clearPile` and resets state
- Edge case: Total is `$0.00` for empty pile
- Edge case: Record with null price contributes zero to total
- Integration: Escape key closes dialog (existing test — verify still passes)
- Integration: `aria-modal="true"` and `role="dialog"` are set
- Integration: `aria-labelledby` targets an element with id `"pile-sheet-title"` that exists
- Responsive: Compact tier renders bottom-sheet with drag handle bar
- Responsive: Wide tier renders side-panel

**Verification:**
- All test scenarios pass
- Tests do not rely on internal implementation details (confirmClear state variable name, etc.)

---

### U11. Test Coverage: RecordCard

**Goal:** Add comprehensive tests for RecordCard — flip mechanics, drag suppression, prop variants, back-face content, and pile integration.

**Requirements:** R11

**Dependencies:** None (tests against current component interface)

**Files:**
- Create: `app/frontend/components/record_card.test.tsx`

**Approach:**
- Wrap RecordCard in `PileProvider` for pile button tests.
- Use `userEvent.click` and `userEvent.pointer` for flip and drag tests.
- Test `disableFlip` prop renders non-interactive card.
- Test `resetKey` unflip behavior.
- Test `framed` prop styling.
- Test back-face content: meta string, genres (max 3), price, pile toggle, Discogs link.

**Patterns to follow:**
- Existing RecordCard test in `accessibility.test.tsx:53` (keyboard flip) and `:218` (no nested buttons) — extend these

**Test scenarios:**
- Happy path: Click flips card (front → back)
- Happy path: Back-face shows title, artist, meta string, genres, price, pile button, Discogs link
- Happy path: Pile button toggles between "+ Pile" and "✓ In pile"
- Happy path: Discogs link renders with correct `href`, `target="_blank"`, `rel="noopener"`
- Edge case: Click after pointer-move > 8px does NOT flip (drag suppression)
- Edge case: `disableFlip={true}` renders no `role="button"`, no `tabIndex`, click does nothing
- Edge case: `disableFlip={true}` removes `aria-pressed` attribute
- Edge case: `resetKey` change triggers unflip via useEffect
- Edge case: `framed={true}` applies box-shadow style
- Edge case: Back-face genres slice to max 3
- Edge case: Front-face shows cover_image_url, falls back to ♪ placeholder when null

**Verification:**
- All test scenarios pass
- No false positives from Framer Motion's animation lifecycle (use `jest.useFakeTimers` or `waitFor` as needed)

---

### U12. Test Coverage: CrateCard

**Goal:** Add comprehensive tests for CrateCard — hover states, keyboard navigation, empty state, and thumbnail click indexing.

**Requirements:** R10

**Dependencies:** U5 (CrateCard interface stabilizes after dedup — write tests after U5 lands)

**Files:**
- Create: `app/frontend/components/crate_card.test.tsx`

**Approach:**
- Test the component as rendered via its consumers (FeaturedCratesRow, GenreGrid) or directly with `renderWithTier`.
- Test keyboard Enter/Space on the interactive wrapper.
- Test closest-guard: keyboard event does not fire when target is a nested button.
- Test empty state rendering.
- Test animation `animate` target values rather than `useTactileHover` internal proximity.
- Test thumbnail click calls `onSelectCrate` with correct slug and index.

**Patterns to follow:**
- Existing CrateShelf test patterns (`crate_shelf.test.tsx`)

**Test scenarios:**
- Happy path: Keyboard Enter on outer div calls `onSelectCrate` with slug
- Happy path: Keyboard Space on outer div calls `onSelectCrate` with slug
- Happy path: Thumbnail button click calls `onSelectCrate` with slug and correct index (0-3)
- Happy path: Thumbnail button `stopPropagation` prevents outer click handler
- Edge case: Keyboard event does not fire when `e.target.closest("button, a")` is truthy
- Edge case: Empty crate (records.length === 0) shows "No records yet" and no grid
- Edge case: `variant="featured"` renders `text-base font-semibold` header
- Edge case: `variant="genre"` renders `text-sm font-semibold` header
- Animation: `animate` target has `scale: SCALE_HOVER` when `isHovered` (test via `motion.div` props snapshot or by mocking `useTactileHover`)

**Verification:**
- All test scenarios pass
- CrateCard integration (FeaturedCratesRow/GenreGrid) still renders correctly after U5 refactor

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CrateView decomposition breaks guard conditions in responsive branches | Run guard-parity audit checklist after U4: verify every conditional on original render path appears on every new branch |
| CrateCard/CrateShelf dedup changes DOM structure, breaking existing integration tests | Run `npm run test:components` after U5 and fix any selector breakage; CrateShelf test is the reference for expected DOM |
| Price formatting changes RecordCard/PileSheet visual output for non-USD currencies | GBP/EUR stores currently see wrong symbols — this is a fix, not a regression. Verify with test data containing GBP and EUR pricing |
| New tests depend on Framer Motion animation lifecycle timing | Use `jest.useFakeTimers` with `act()` or `waitFor` for spring-based animations; existing CrateView tests already handle this |
| Type safety fix for `app_layout.tsx` may narrow props too aggressively, breaking pages that pass extra props | Use optional properties throughout the narrow interface; if a prop was always `undefined`, the page never depended on it |

---

## Sources & References

- **Origin document:** None — sourced from holistic frontend health check findings (2026-05-18)
- Pattern reference: `app/frontend/layouts/milkcrate_shell.tsx` — slot-based decomposition pattern
- Pattern reference: `app/frontend/test/viewport-test-utils.tsx` — renderWithTier utility
- Pattern reference: `app/frontend/components/accessibility.test.tsx` — accessibility test patterns
- Learning: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
- Learning: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- Learning: `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- Learning: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- Prior plan: `docs/plans/2026-05-18-001-refactor-frontend-unused-code-cleanup-plan.md`
