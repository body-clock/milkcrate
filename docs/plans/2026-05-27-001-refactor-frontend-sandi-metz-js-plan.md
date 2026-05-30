---
title: "refactor: Apply Sandi Metz JS rules to frontend components"
type: refactor
status: active
date: 2026-05-27
---

# refactor: Apply Sandi Metz JS Rules to Frontend Components

## Summary

Decompose oversized React components, extract shared hooks, and add shared UI primitives to bring the frontend into compliance with Sandi Metz rules adapted for JS/React. 26 findings from a `sandi-metz-js-review` audit covering component size, JSX return length, prop count, abstraction-level mixing, hook complexity, and missing abstractions.

---

## Problem Frame

A `sandi-metz-js-review` audit found 26 violations across the frontend: 10 components over 100 lines (CrateView at 452, PileSheet at 457), 5 JSX returns over 15 lines, 2 components with 5+ props, 4 components mixing fetch + render, a 178-line hook managing 4 concerns, and repeated inline patterns (spinner SVG, back button, TOTP input) with no shared abstraction. The codebase already has well-factored examples — RecordTile (57 lines), MilkcrateShell (60 lines) — but the larger components accreted complexity across many feature PRs without decomposition.

---

## Requirements

- R1. All components ≤ 100 lines (Sandi Metz Rule 1 for JS)
- R2. All JSX return blocks ≤ 15 lines (Sandi Metz Rule 2 for JS)
- R3. All component props ≤ 4 (Sandi Metz Rule 3 for JS)
- R4. No component mixes fetch + render or state + layout (Sandi Metz Rule 4 for JS)
- R5. All custom hooks ≤ 20 lines (Sandi Metz Rule 5 for JS)
- R6. No repeated inline patterns — shared primitives for BackButton, Spinner, TotpCodeInput
- R7. All existing test suites pass with no behavioral regressions
- R8. Obsolete structural tests are pruned; behavior tests are preserved

---

## Scope Boundaries

- Backend code is out of scope — frontend-only
- CSS/styling changes are out of scope
- New features are out of scope
- Type definition changes are out of scope (types/inertia.ts stays as-is)

---

## Context & Research

### Relevant Code and Patterns

- **RecordTile** (`components/record_tile.tsx`, 57 lines) — gold standard for single-responsibility component
- **MilkcrateShell** (`layouts/milkcrate_shell.tsx`, 60 lines) — slot/children composition pattern
- **BrandMark** (`components/brand_mark.tsx`, 36 lines) — variant-driven via prop, minimal state
- **CrateCard** (`components/crate_card.tsx`, 47 lines) — thin composition wrapper
- **CrateTabs** (`components/crate_tabs.tsx`, 68 lines) — single responsibility, data via props
- **Button** (`components/ui/button.tsx`, 30 lines) — variant/size prop pattern
- **Token library** (`lib/motion_tokens.ts`) — single source of truth for animation constants
- **Motion config** (`components/storefront_motion_config.tsx`) — provider + context + hook pattern

### Institutional Learnings

- **Guard-parity audit**: After splitting render paths, audit every branch for guard-condition parity. A prior refactor dropped a guard from the desktop path while carrying it on compact. Run the 4-step checklist on every decomposed component. (`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`)
- **Provider + Context + Hook**: Three-layer pattern for shared hooks. Use `describe.each` + context injection for test coverage instead of mocking browser APIs. (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`)
- **Four-layer architecture**: Tokens → Provider → Hook → Wrappers. Name by perceptual quality, not number (`springTactile`, not `spring-0.3`). (`docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`)
- **Keep extracted internals private**: Sub-components and hooks that are implementation details should stay module-private. Retire structural tests after refactor stabilizes; keep behavior tests. (`docs/solutions/best-practices/sandi-metz-refactor-helpers-stay-private-and-behavior-specs.md`)
- **Responsive ternary inversion**: When inverting boolean abstractions (`isDesktop` → `isCompact`), audit every ternary at every call site. (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`)

### Project Conventions

- **Flat component directory** — no subdirectories for component groups; sub-components that are internal to one parent stay in the parent's file
- **Co-located tests** — `component.tsx` → `component.test.tsx` in same directory
- **Hook naming**: snake_case files (`use_dialog_focus_trap.ts`), named exports (`export function useDialogFocusTrap`)
- **`@/` alias** for cross-domain imports; relative paths for same-directory
- **Test pattern**: `make*` factory functions, `render*` wrapper helpers, behavioral assertions (no snapshots)
- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`

---

## Key Technical Decisions

- **Internal sub-components stay in the parent file** — matches PileSheet's existing pattern (PileRecordItem, WantlistResultView, etc. are all in `pile_sheet.tsx`). Only genuinely shared components (BackButton, Spinner) get their own files.
- **Extracted hooks get their own files** — hooks are the shared abstraction layer; each extracted hook is a named export from its own file under `hooks/`.
- **No new subdirectories** — the flat `components/` convention stays; no `components/crate_view/` or similar groupings.
- **BackButton and Spinner go in `components/` (not `components/ui/`)** — `ui/` is for design-system primitives; these are application-level shared components.
- **Test preservation over test rewrite** — existing test suites for CrateView (817 lines) and PileSheet (582 lines) are large and comprehensive. Refactor code in a way that keeps them passing, then prune structural assertions that break on internal reorg.

---

## Implementation Units

### U1. Extract shared hooks

**Goal:** Create foundational hooks that other refactors depend on.

**Requirements:** R5, R6

**Dependencies:** None

**Files:**
- Create: `app/frontend/hooks/use_dialog_focus_trap.ts`
- Create: `app/frontend/hooks/use_discogs_lookup.ts`
- Create: `app/frontend/hooks/use_pointer_proximity.ts`
- Create: `app/frontend/hooks/use_tactile_transform.ts`
- Test: `app/frontend/hooks/use_dialog_focus_trap.test.ts`
- Test: `app/frontend/hooks/use_discogs_lookup.test.ts`
- Test: `app/frontend/hooks/use_pointer_proximity.test.ts`
- Test: `app/frontend/hooks/use_tactile_transform.test.ts`

**Approach:**
- `useDialogFocusTrap(open, returnFocusRef)` — extracts the 3 useEffect blocks from PileSheet's focus management. Returns `{ dialogRef, titleRef }`. Handles Escape key, Tab cycling, focus return on close, and focus restoration when pile contents change.
- `useDiscogsLookup(username)` — extracts the fetch + AbortController + state machine from DiscogsSellerLookupInput. Returns `{ state, result, lookup, reset }`. Reusable by InvitationContent.
- `usePointerProximity(ref, options)` — extracts the enter/move/leave + rAF throttling + touch detection from useTactileHover. Returns `{ proximity, handlers }`.
- `useTactileTransform(proximity, isPressed, options)` — pure computation hook for Framer Motion style values. Returns `{ transform, transition }`.

**Patterns to follow:**
- `hooks/use_tactile_hover.ts` — existing hook conventions (options interface, return interface, named export)
- `contexts/viewport_context.tsx` + `hooks/use_viewport.ts` — Provider + Context + Hook pattern

**Test scenarios:**
- Happy path: `useDialogFocusTrap` traps focus on open, cycles Tab through focusable elements, returns focus on close
- Happy path: `useDiscogsLookup` fetches on `lookup("username")`, transitions through loading → success/error states
- Happy path: `usePointerProximity` computes 0–1 proximity from pointer position relative to element center
- Edge case: `useDiscogsLookup` aborts in-flight request on second `lookup()` call, handles AbortError silently
- Edge case: `usePointerProximity` returns proximity 0 on touch devices and when reduced motion is active
- Edge case: `useDialogFocusTrap` handles dialog with zero focusable elements (focuses titleRef)

**Verification:**
- All four hooks have co-located test files passing
- Hook interfaces are well-typed with exported options/return interfaces

---

### U2. Extract shared UI primitives

**Goal:** Create BackButton and Spinner components to replace inline copies.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Create: `app/frontend/components/back_button.tsx`
- Create: `app/frontend/components/spinner.tsx`
- Test: `app/frontend/components/back_button.test.tsx`
- Test: `app/frontend/components/spinner.test.tsx`

**Approach:**
- `BackButton` accepts `variant: 'icon' | 'text'` and `label?: string`. Icon variant renders the circular ← button (compact pattern). Text variant renders the "← Store" pill button (desktop pattern). Both share the same aria-label, hover/focus/active styles, and focus-visible ring.
- `Spinner` accepts `size: 'sm' | 'md' | 'lg'`. Renders the SVG spinner with `animate-spin`. Replaces all 3 inline copies (DiscogsSellerLookupInput, Apply, StoreShow).

**Patterns to follow:**
- `components/ui/button.tsx` — variant/size prop pattern, className composition

**Test scenarios:**
- Happy path: BackButton icon variant renders circular button with ← and aria-label
- Happy path: BackButton text variant renders pill button with label text
- Happy path: Spinner renders SVG with animate-spin class
- Edge case: BackButton handles missing optional label gracefully
- Edge case: Spinner sm/md/lg sizes render with correct dimensions

**Verification:**
- Both components have co-located test files passing
- No behavioral changes in any consuming component

---

### U3. Refactor useTactileHover to compose extracted hooks

**Goal:** Reduce useTactileHover from 178 lines to ~40 lines by composing usePointerProximity + useTactileTransform.

**Requirements:** R5

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/hooks/use_tactile_hover.ts`
- Modify: `app/frontend/hooks/use_tactile_hover.test.tsx`

**Approach:**
- Internally calls `usePointerProximity` for the proximity/handlers, `useTactileTransform` for the motion style
- Public interface (`useTactileHover(options) → TactileState`) remains unchanged
- The existing test file is updated only as needed — the public contract is the same

**Patterns to follow:**
- Existing `useTactileHover` return interface — preserve the public API

**Test scenarios:**
- Happy path: same tests pass with composed implementation
- Edge case: reduced motion still returns identity transforms
- Edge case: touch devices still return proximity 0

**Verification:**
- All existing `use_tactile_hover.test.tsx` tests pass
- `useTactileHover` is ≤ 50 lines

---

### U4. Refactor PileSheet with useDialogFocusTrap and PileFooter

**Goal:** Reduce PileSheet main component to concise orchestrator by using extracted hook and extracting footer.

**Requirements:** R1, R2, R4

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/components/pile_sheet.tsx`
- Modify: `app/frontend/components/pile_sheet.test.tsx`

**Approach:**
- Replace 3 useEffect focus-trap blocks with `useDialogFocusTrap(open, returnFocusRef)`
- Extract footer section (lines ~419-448) as internal `PileFooter` sub-component receiving `pile`, `shopper`, `isConnected`, `state`, `wantlistResult`, etc.
- PileFooter conditionally renders ConnectedAccount, WantlistResultView, WantlistErrorView, WantlistInProgressView, WantlistHandoffAction, or DisconnectedCta

**Patterns to follow:**
- Existing `PileRecordItem` sub-component pattern in the same file
- Guard-parity audit checklist from learnings

**Test scenarios:**
- Happy path: pile sheet opens, closes, traps focus, returns focus on close
- Happy path: footer renders correct state (connected, disconnected, in-progress, success, error)
- Edge case: Escape key closes sheet and returns focus
- Edge case: Tab cycling stays within dialog boundaries

**Verification:**
- All existing `pile_sheet.test.tsx` tests pass
- Main `PileSheet` component ≤ 120 lines

---

### U5. Refactor DiscogsSellerLookupInput with useDiscogsLookup

**Goal:** Separate fetch/state-machine from rendering by using extracted hook. Extract status sub-components internally.

**Requirements:** R1, R2, R4

**Dependencies:** U1, U2

**Files:**
- Modify: `app/frontend/components/discogs_seller_lookup_input.tsx`
- Modify: `app/frontend/components/discogs_connection_controls.test.tsx`

**Approach:**
- Replace inline fetch/AbortController/state-machine with `useDiscogsLookup(username)`
- Extract each AnimatePresence status branch as internal named sub-components (LookupLoading, LookupPreview, LookupNotFound, LookupActiveStore, LookupApplicant, LookupApiError)
- Replace inline spinner SVGs with `<Spinner size="sm" />`

**Patterns to follow:**
- PileSheet's internal sub-component pattern
- Guard-parity: verify all 6 status branches render correctly after extraction

**Test scenarios:**
- Happy path: entering a valid username shows preview state
- Happy path: entering an invalid username shows not-found state
- Edge case: rapid re-submission aborts previous request
- Edge case: API error surface shows retry option

**Verification:**
- DiscogsSellerLookupInput ≤ 150 lines
- Main component reads as orchestrator composing hook + sub-components
- No behavioral regression in Discogs username lookup flow

---

### U6. Refactor InvitationContent with useDiscogsLookup

**Goal:** Replace inline fetch/state-machine with shared hook, extract sub-components.

**Requirements:** R1, R4

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/pages/stores/invitation.tsx`
- Test: `app/frontend/pages/stores/invitation.test.tsx` (if needed)

**Approach:**
- Replace inline fetch + AbortController + shouldProbe logic with `useDiscogsLookup(slug)`
- Extract `InvitationFound` and `InvitationNotFound` as internal sub-components
- Preserve the `shouldProbe` reserve-slug validation — pass it as an option to the hook or gate the lookup call

**Patterns to follow:**
- U5's DiscogsSellerLookupInput refactor — same hook, same pattern

**Test scenarios:**
- Happy path: valid slug → found state with seller name and claim button
- Happy path: invalid slug → not-found state with apply link
- Edge case: reserved slugs ("admin", "api") skip the probe
- Edge case: waitlist_present prop renders static page (no probe)

**Verification:**
- InvitationContent ≤ 100 lines
- Waitlist-present static page still renders correctly

---

### U7. Refactor CrateView — decompose into sub-components and hook

**Goal:** Reduce CrateView from 452 lines to ~100-line orchestrator.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U2

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`
- Create: `app/frontend/hooks/use_crate_navigation.ts`
- Test: `app/frontend/hooks/use_crate_navigation.test.ts`
- Modify: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Extract `useCrateNavigation(indexRef, total, isCompact) → { navigate, edgeStatus, progress, handleKeyDown, showGestureHint }` as a custom hook owning index state, edge detection, keyboard bindings, and gesture-lesson lifecycle
- Extract `CrateHeader` as internal sub-component accepting compact variant, onBack, crate metadata, tabs. Uses `<BackButton>` for back navigation
- Extract `CardStack` as internal sub-component for hint cards + active card animation
- Extract `CrateProgress` as internal sub-component for progress bar + paginator + edge status
- CrateView becomes: `<CrateHeader /> + <CardStack /> + <CrateProgress /> + <RecordDetails />` composed together

**Patterns to follow:**
- Existing CrateTabs component pattern
- Guard-parity audit: verify compact and desktop header branches both render correctly
- PileSheet's internal sub-component co-location pattern

**Test scenarios:**
- Happy path: keyboard navigation (ArrowDown/ArrowUp) navigates through crate
- Happy path: drag gesture navigates between records
- Happy path: compact and desktop layouts both render correctly
- Edge case: edge of crate disables appropriate navigation button
- Edge case: empty crate shows "No records in this crate yet"
- Edge case: gesture hint lifecycle — shown on first visit, hidden after interaction
- Edge case: keyboard navigation skips when modal dialog is open

**Verification:**
- All existing `crate_view.test.tsx` tests pass (40+ test cases)
- CrateView main component ≤ 120 lines
- `useCrateNavigation` ≤ 40 lines
- No behavioral regression in crate browsing

---

### U8. Split CrateShelf into static and interactive variants

**Goal:** Remove 5 conditional branches by splitting into two focused components.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/crate_shelf.tsx`
- Modify: `app/frontend/components/crate_shelf.test.tsx`

**Approach:**
- `CrateShelfLayout` — internal shared layout skeleton (header + grid)
- `StaticCrateShelf` — non-interactive, decorative display
- `InteractiveCrateShelf` — clickable with keyboard support, motion animations
- Public default export remains `CrateShelf` which delegates to the appropriate variant based on `interactive` prop
- Props reduced from 10 to: `crate`, `interactive`, `onSelectCrate?`, `previewCount`, `meta?`, `openLabel?`, `headerSize?`, `tactileThumbnails?`

**Patterns to follow:**
- Existing variant pattern from BrandMark (size prop delegates to different render paths)

**Test scenarios:**
- Happy path: static shelf renders header, grid, preview records
- Happy path: interactive shelf renders with role="button", tabIndex, keyboard handler
- Edge case: empty crate with 0 records renders correctly
- Edge case: interactive shelf with no onSelectCrate renders as static (graceful degradation)

**Verification:**
- All existing `crate_shelf.test.tsx` tests pass
- Props interface ≤ 8 props
- No behavioral regression in shelf rendering

---

### U9. Medium sweeps — AppHeader, FeatureCard, StepCard, DiscogsOnboardingPanel, RecordCardBack

**Goal:** Decompose 5 medium-sized components in parallel.

**Requirements:** R1, R2

**Dependencies:** U2 (AppHeader uses BackButton)

**Files:**
- Modify: `app/frontend/layouts/app_layout.tsx` — extract AppHeader as internal sub-component
- Modify: `app/frontend/pages/home.tsx` — extract FeatureCard, StepCard as internal sub-components
- Modify: `app/frontend/pages/admin/dashboard.tsx` — extract DiscogsOnboardingPanel, LookupResult, LookupMessage as internal sub-components
- Modify: `app/frontend/components/record_card.tsx` — extract RecordCardBack as internal sub-component
- Modify: `app/frontend/pages/stores/show.tsx` — extract `useCrateRouting` hook
- Modify: `app/frontend/pages/apply.tsx` — extract `useTurnstile` hook
- Modify: `app/frontend/pages/admin/totp_setup.tsx` — extract TotpCodeInput, share with totp_challenge.tsx
- Modify: affected test files

**Approach:**
- AppHeader extracts ~80 lines of header JSX with 3 variants (compactCrateLocation, storeName, BrandMark)
- Home extracts 4 FeatureCards and 3 StepCards — each becomes a small internal sub-component
- AdminDashboard extracts DiscogsOnboardingPanel (~55 lines) as internal sub-component
- RecordCard extracts RecordCardBack (~35 lines) as internal sub-component
- StoreShow extracts useCrateRouting hook owning activeSlug/startIndex state + history pushState + popstate listener
- Apply extracts useTurnstile hook owning script injection, widget render, cleanup
- TOTP extracts TotpCodeInput shared component used by both totp_setup and totp_challenge

**Patterns to follow:**
- U4 PileSheet internal sub-component pattern
- U7 useCrateNavigation hook pattern

**Test scenarios:**
- Happy path: AppLayout renders with all 3 header variants
- Happy path: Home renders FeatureCards and StepCards with correct copy
- Happy path: AdminDashboard renders DiscogsOnboardingPanel
- Happy path: RecordCard flip reveals back face
- Happy path: StoreShow routes between crates via URL
- Happy path: Apply renders Turnstile widget
- Happy path: TOTP input accepts only digits, enforces 6-char limit

**Verification:**
- Each component ≤ 100 lines (or has a clear reason for slight excess)
- All affected test files pass
- No behavioral regression

---

### U10. Replace inline copies with shared primitives

**Goal:** Eliminate all remaining inline spinner and back button copies.

**Requirements:** R6

**Dependencies:** U2

**Files:**
- Modify: `app/frontend/components/discogs_seller_lookup_input.tsx` (if not done in U5)
- Modify: `app/frontend/pages/apply.tsx` — replace inline spinner
- Modify: `app/frontend/pages/stores/show.tsx` — replace inline spinner
- Modify: `app/frontend/components/crate_view.tsx` — replace inline back buttons (if not done in U7)
- Modify: `app/frontend/layouts/app_layout.tsx` — replace inline back button

**Approach:**
- Grep for remaining inline SVG spinners and back button markup
- Replace with `<Spinner />` and `<BackButton />`
- Verify visual parity

**Patterns to follow:**
- U2's BackButton and Spinner components

**Test scenarios:**
- Happy path: loading states show Spinner component
- Happy path: back navigation shows BackButton with correct variant

**Verification:**
- No inline spinner SVGs or back button markup remaining outside of BackButton.tsx and Spinner.tsx
- grep confirms zero remaining copies

---

### U11. Test pruning and audit

**Goal:** Remove obsolete structural tests, keep behavioral tests.

**Requirements:** R7, R8

**Dependencies:** U3, U4, U5, U6, U7, U8, U9, U10

**Files:**
- Modify: all test files affected by refactors above

**Approach:**
- For each refactored component, audit its test file
- Remove tests that assert exact component structure (hook inventory, sub-component tree shape, line counts)
- Keep tests that assert observable behavior (what renders, what happens on click, what states display)
- Remove tests for components that no longer exist (e.g., if a test validates an inline sub-component that was extracted)
- For the page smoke tests (`test/pages/*.test.tsx`), assess whether each test is still useful — prune any that duplicate component-level test coverage or test dead paths

**Patterns to follow:**
- `docs/solutions/best-practices/sandi-metz-refactor-helpers-stay-private-and-behavior-specs.md` — retire structural tests, keep behavior tests

**Test scenarios:**
- Each remaining test validates a specific behavior, not an implementation detail

**Verification:**
- All remaining tests pass
- No tests fail because they assert old component boundaries
- Full test suite: `cd app/frontend && npx vitest run`

---

### U12. Final verification

**Goal:** Confirm all requirements are met and no regressions exist.

**Requirements:** R1-R8

**Dependencies:** U11

**Approach:**
- Run full test suite: `cd app/frontend && npx vitest run`
- Run TypeScript check: `cd app/frontend && npx tsc --noEmit`
- Re-run `sandi-metz-js-review` to verify findings are resolved
- Run `scripts/lint-design-system-tokens.ts` to verify token compliance
- Manually audit each of the 26 original findings — confirm each is resolved or has a documented reason for deferral

**Verification:**
- All tests pass
- TypeScript compiles with zero errors
- sandi-metz-js-review returns zero violations (or only documented exceptions)
- No lint errors

---

## System-Wide Impact

- **Interaction graph:** CrateView, PileSheet, and DiscogsSellerLookupInput are the most-interacted-with components. Their refactors must preserve all keyboard navigation, focus management, and drag gesture contracts.
- **Error propagation:** useDiscogsLookup hook must preserve AbortError silent handling and error surface patterns.
- **State lifecycle risks:** useCrateNavigation moves index state from component to hook — ensure the hook's cleanup handles rapid crate switching without stale state.
- **API surface parity:** useDiscogsLookup must work identically for DiscogsSellerLookupInput (store onboarding) and InvitationContent (URL probe).
- **Integration coverage:** CrateView's keyboard navigation must work correctly when a modal dialog is open (existing guard: `document.querySelector('[role="dialog"][aria-modal="true"]')`).
- **Unchanged invariants:** All Framer Motion animation behavior, all Tailwind styling, all Inertia page props contracts, all API endpoint contracts remain unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| CrateView test suite (817 lines) breaks on internal reorg | Run tests after each extraction; use existing test as behavior specification |
| PileSheet focus management regression | useDialogFocusTrap extracts existing logic mechanically — minimal change |
| Guard condition lost during branch decomposition | Run guard-parity audit checklist on every extracted sub-component |
| useDiscogsLookup doesn't handle InvitationContent's shouldProbe reserve-slug logic | Pass shouldProbe as a gating option to the hook |
| Shared BackButton/Spinner don't match existing visual styles | Copy existing Tailwind classes exactly; verify with visual diff |

---

## Sources & References

- Origin review: sandi-metz-js-review findings (26 items across app/frontend/)
- Guard parity: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
- Viewport pattern: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- Animation tokens: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- Private internals: `docs/solutions/best-practices/sandi-metz-refactor-helpers-stay-private-and-behavior-specs.md`
- Brand architecture: `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
