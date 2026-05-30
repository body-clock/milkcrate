---
title: "refactor: Second wave Sandi Metz JS refactoring — module directories, prop reduction, deduplication"
type: refactor
status: active
date: 2026-05-28
origin: sandi-metz-js-review (2026-05-28 — full frontend audit)
---

# refactor: Second wave Sandi Metz JS refactoring — module directories, prop reduction, deduplication

## Summary

Address remaining POODR findings from a second sandi-metz-js-review audit after the first wave (2026-05-27) extracted shared hooks and primitives. This wave targets: module directory extraction for oversized files (>250 lines), prop count reduction (10-prop CrateHeader, 10-prop AppHeader, 11-field PileFooterModel, 7-prop CrateView), collapsing variant-string patterns into separate components (BackButton, PicksShelf), deduplicating FeaturedCratesRow/GenreGrid into a shared primitive, extracting the admin Discogs lookup to use the shared hook, and breaking data clumps into focused domain objects.

---

## Problem Frame

A sandi-metz-js-review audit after the first refactoring wave found the following categories of remaining violations, none of which were addressed by the first wave's approach (which kept sub-components internal within parent files):

1. **File bloat persisted** — crate_view.tsx (554 lines), pile_sheet.tsx (452 lines), admin/dashboard.tsx (401 lines), home.tsx (362 lines) still contain 5–10 internal sub-components each. The first wave's "internal only" strategy kept line counts high.
2. **Prop overload** — CrateHeader (10 props), AppHeader (10 props), CrateShelfLayout (12+ params via destructuring), CrateView (7 props), CrateProgress (7 props) exceed the 3–4 prop guideline. Boolean pairs like `hideTabs` + `compactHeaderOwnedByLayout` want collapsing into a layout-mode enum.
3. **Branching-on-string pattern** — BackButton uses `variant: "icon" | "text"` to render two completely different buttons. The `PicksShelf`/`CompactPicksShelf`/`DesktopPicksShelf` trio duplicates the same pattern at the viewport level.
4. **Duplication** — FeaturedCratesRow and GenreGrid are structurally identical (section header + responsive CrateCard grid + column computation). Admin dashboard reimplements Discogs lookup inline instead of using the already-extracted `useDiscogsLookup` hook.
5. **Data clumps** — PileFooterModel (11 fields) bundles unrelated domains (shopper identity, wantlist state, submission lifecycle). Copy props (11–25 strings) are threaded individually through component trees.
6. **Style duplication** — `compositedLayerStyle` and `activeLayerStyle` differ by only one property.
7. **Viewport branching proliferation** — `isCompact` is checked independently in every sub-component of CrateView, driving the same layout-mode decisions at multiple levels of the component tree.

---

## Requirements

- R1. No component file exceeds 250 lines of source (not counting imports and blank lines). Sub-components that render their own content and manage their own props must be extracted to dedicated files within a module directory.
- R2. No component accepts more than 5 props. (Exception: layout shells like MilkcrateShell that accept slot content.)
- R3. No function or method accepts more than 6 named parameters.
- R4. No branching-on-string `variant` prop chooses between fundamentally different UIs. Replace with separate components or discriminated unions.
- R5. No structurally duplicate components. Three or more structurally identical components must share a primitive.
- R6. No inline Discogs lookup state management — use the already-extracted `useDiscogsLookup` hook in the admin dashboard.
- R7. No redundant CSS-in-JS style objects — extract shared style factories.
- R8. All existing test suites pass with no behavioral regressions.
- R9. The three-tier viewport branching in CrateView sub-components is consolidated to a single decision point per render tree.

---

## Scope Boundaries

- This is frontend-only (`app/frontend/`). Backend, database, and types remain untouched.
- No new features. Pure structural refactoring.
- No CSS or visual styling changes — extracted components use identical Tailwind classes.
- No changes to `types/inertia.ts` — type contracts remain stable.
- No changes to animation behavior or motion tokens.
- `copy` prop bundling (translation object extraction) is **deferred** — the copy-prop pattern is a server-passed convention that would require backend coordination to change.
- Admin Discogs lookup extraction uses the existing `useDiscogsLookup` hook — no new hook needed.

---

## Context & Research

### What the First Wave Did

The 2026-05-27 Sandi Metz plan (fully executed) extracted:
- Shared hooks: `useDialogFocusTrap`, `useDiscogsLookup`, `usePointerProximity`, `useTactileTransform`
- Shared components: `BackButton`, `Spinner`
- Hook composition: `useTactileHover` composes usePointerProximity + useTactileTransform
- Internal sub-components: CrateHeader, CardStack, CrateProgress (inside crate_view.tsx)
- Internal sub-components: PileRecordItem, PileFooter (inside pile_sheet.tsx)
- Internal sub-components: DiscogsSellerLookupInput status branches
- Hook extraction: `useCrateNavigation`, `useCrateRouting`, `useTurnstile`
- Inline Spinner/BackButton replacement across all consumers

### What the First Wave Did NOT Address

- Sub-components stayed internal to their parent files (chosen approach)
- BackButton was created WITH the variant-string pattern
- FeaturedCratesRow and GenreGrid remained as separate files
- Admin dashboard kept its inline Discogs lookup
- PileFooterModel's 11-field data clump was created by the refactor
- compositedLayerStyle/activeLayerStyle duplication was not extracted
- CrateShelfLayout's 12-destructured-param pattern was not reduced
- PicksShelf viewport branching was not consolidated

### Relevant Code and Patterns

- **useDiscogsLookup** (`hooks/use_discogs_lookup.ts`) — already extracted, ready to consume in admin dashboard
- **CrateShelf discriminated union** (`components/crate_shelf.tsx`) — existing pattern for `StaticCrateShelfProps | InteractiveCrateShelfProps`. Use this as the template for BackButton's refactor
- **RecordTile extraction** — precedent for extracting a shared visual primitive (RecordTile) from RecordCard. FeaturedCratesRow/GenreGrid follow the same pattern
- **renderWithTier** — test utility for viewport-tier-specific component testing
- **Guard-parity checklist** — from `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`. Run on every isCompact branch split

### Institutional Learnings

- **Guard-parity audit** (docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md): After splitting render paths, audit every branch for guard conditions. Write a 4-step checklist for each decomposed component.
- **Private helpers** (docs/solutions/best-practices/sandi-metz-refactor-helpers-stay-private-and-behavior-specs.md): Keep extracted sub-components module-private via barrel exports. Only the parent component is exported from the module directory's index.ts. Retire structural tests after stabilization.
- **Boolean inversion trap** (docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md): When inverting `setCompact ? A : B`, audit every ternary individually.
- **Progressive migration** (docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md): Create the module directory/index.ts first, then move one file at a time, verifying tests after each move.

---

## Key Technical Decisions

- **Module directories (new convention)**: For the first time in this codebase, extract component families into subdirectories: `components/crate_view/`, `components/pile_sheet/`. Each gets an `index.ts` that re-exports only the public component. Internal sub-components are imported by the barrel. This is a deliberate convention extension — the existing flat directory works well for single components but breaks down for files >250 lines.
- **BackButton → discriminated union**: Replace `variant: "icon" | "text"` with separate `IconBackButton` and `TextBackButton` components, following the established `StaticCrateShelf | InteractiveCrateShelf` pattern. A common `BaseBackButtonProps` interface shares the onClick/className/aria-label contract.
- **CrateHeader layout-mode enum**: Collapse `hideTabs` + `compactHeaderOwnedByLayout` into a single `layoutMode: "full" | "compact" | "minimal"` enum, simplifying the branching logic and reducing CrateHeader from 10 props to 7.
- **PileFooterModel decomposition**: Split the 11-field model into three focused types: `PileState` (submission lifecycle), `StoreInfo` (store name/slug for CTAs), `ShopperInfo` (discogs_username/connection status).
- **Admin Discogs lookup**: Use the existing `useDiscogsLookup` hook directly. The admin panel needs the same state machine. The admin-specific `fetch` + `AbortController` + `timeoutRef` pattern in `onboarding_panel` gets replaced with the hook.
- **Style constant extraction**: `compositedLayerStyle` + `activeLayerStyle` → `sharedLayerStyle(contain?: boolean)` factory function in `lib/motion_tokens.ts`.
- **No barrel files extracted to `components/` root**: Module directories are specific to the oversized files. The existing flat `components/` structure remains for all other components.
- **Test preservation**: Refactor in a way that keeps existing tests passing. Only change tests that break because internal imports changed (replace relative imports to `../` with imports from the module's `index.ts` barrel).

---

## Open Questions

### Resolved During Planning

- **Should BackButton become a discriminated union or separate export?** Separate exports (`IconBackButton`, `TextBackButton`) — matches the established CrateShelf pattern. Consumers import only the variant they need. The discriminated union inside the component (what CrateShelf does) is fine for components with internal branching, but BackButton's two variants are used in different contexts (icon in compact headers, text in desktop headers) and never need to be swapped at runtime.

- **Should admin dashboard's Discogs lookup use the existing hook?** Yes. The existing `useDiscogsLookup` already handles fetch, abort, timeout, and the same 7-state machine. The admin version adds `shouldProbe` reserve-slug logic — this becomes an option parameter on the hook.

- **Where to put shared style factories?** `lib/motion_tokens.ts` — it already holds shared animation constants. A `compositedLayerStyle()` function is a natural extension. The existing file's exports are all animation-related; a single factory function is in scope.

### Deferred to Implementation

- **Should `shouldProbe` be added to `useDiscogsLookup` or handled by the consumer?** Consumer-side. The Invitation page already gates on `shouldProbe` before calling `lookup(slug)`. The admin panel can do the same.

---

## Implementation Units

### U1. Extract crate_view module directory

**Goal:** Reduce crate_view.tsx from 554 lines to a ~60-line orchestrator by extracting sub-components to their own files within `components/crate_view/`.

**Requirements:** R1, R2, R9

**Dependencies:** None

**Files:**
- Create: `app/frontend/components/crate_view/index.ts`
- Create (extract from crate_view.tsx): `app/frontend/components/crate_view/crate_header.tsx`
- Create (extract from crate_view.tsx): `app/frontend/components/crate_view/card_stack.tsx`
- Create (extract from crate_view.tsx): `app/frontend/components/crate_view/hint_card_stack.tsx`
- Create (extract from crate_view.tsx): `app/frontend/components/crate_view/active_record_card.tsx`
- Create (extract from crate_view.tsx): `app/frontend/components/crate_view/gesture_hint_overlay.tsx`
- Create (extract from crate_view.tsx): `app/frontend/components/crate_view/crate_progress.tsx`
- Modify: `app/frontend/components/crate_view.tsx`
- Modify: `app/frontend/components/crate_view.test.tsx`

**Approach:**
- Create `components/crate_view/` directory with `index.ts` barrel that re-exports only `CrateView` (the public component)
- Extract each sub-component (CrateHeader, CardStack, HintCardStack, ActiveRecordCard, GestureHintOverlay, CrateProgress) to its own file
- CrateView's public `Props` interface stays the same — consumers import from the barrel and see no change
- Remove `compositedLayerStyle` and `activeLayerStyle` from crate_view.tsx (they move to motion_tokens in U8) and use imported constants
- Preserve all existing animation contracts, aria attributes, data-testid markers, and keyboard/drag behavior

**Patterns to follow:**
- `components/crate_tabs.tsx` — standalone component pattern for extracted sub-components
- `components/storefront_motion_config.tsx` — single-purpose export

**Test scenarios:**
- Happy path: barrel import works — `import CrateView from "./crate_view"` still resolves
- Happy path: all 4 CrateView render paths (empty crate, compact with tabs, desktop with details, error state) render identically
- Edge case: GestureHintOverlay extracts to own file with same guard conditions (isCompact, showGestureHint, isLessonEligible)
- Edge case: compositedLayerStyle/activeLayerStyle import correctly from motion_tokens

**Verification:**
- All existing `crate_view.test.tsx` tests pass (40+ test cases)
- `components/crate_view.tsx` ≤ 80 lines
- `components/crate_view/index.ts` exports only `CrateView`

---

### U2. Reduce CrateHeader props

**Goal:** Reduce CrateHeader from 10 props to ≤6 by collapsing boolean pairs into enums and extracting data clumps.

**Requirements:** R2, R9

**Dependencies:** U1 (CrateHeader extracted to its own file)

**Files:**
- Modify: `app/frontend/components/crate_view/crate_header.tsx`
- Modify: `app/frontend/components/crate_view.tsx` (update the CrateView usage of CrateHeader)

**Approach:**
- Collapse `hideTabs: boolean` + `compactHeaderOwnedByLayout: boolean` into a single `layoutMode: "full" | "compact" | "minimal"` enum
- Combine `crates: Crate[]` + `activeSlug: string` + `onSelectCrate` into a single `tabState` object: `tabs: { crates, activeSlug, onSelect }`
- Combine `activeCrate: Crate | undefined` + `total: number` into a single `crateInfo` slot: `{ name, total }`
- Result: CrateHeader goes from `(10 props) → { isCompact, layoutMode, onBack, tabs, activeCrate, total }` or similar collapsed shape. Target: ≤6 props.

**Patterns to follow:**
- `PileFooterModel` pattern (which this refactor will later decompose) — the bundling approach but with smaller, focused objects
- The guard-parity audit checklist from learnings — ensure every branch path is preserved after collapsing

**Test scenarios:**
- Happy path: compact+full header renders tabs with back button
- Happy path: compact+minimal header renders nothing (both hideTabs and compactHeaderOwnedByLayout were true)
- Happy path: desktop header renders back button, divider, tabs
- Edge case: all 3 layoutMode values produce correct render output (verify each)
- Edge case: onBack undefined hides back button in both compact and desktop

**Verification:**
- All existing crate_view tests pass
- CrateHeader interface ≤ 6 props

---

### U3. Extract pile_sheet module directory

**Goal:** Reduce pile_sheet.tsx from 452 lines to a ~90-line orchestrator by extracting sub-components.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `app/frontend/components/pile_sheet/index.ts`
- Create (extract from pile_sheet.tsx): `app/frontend/components/pile_sheet/pile_record_item.tsx`
- Create (extract from pile_sheet.tsx): `app/frontend/components/pile_sheet/wantlist_views.tsx` (WantlistResultView, WantlistErrorView, WantlistInProgressView)
- Create (extract from pile_sheet.tsx): `app/frontend/components/pile_sheet/wantlist_handoff.tsx` (WantlistHandoffAction, DisconnectedCta, ConnectedAccount)
- Create (extract from pile_sheet.tsx): `app/frontend/components/pile_sheet/pile_footer.tsx`
- Modify: `app/frontend/components/pile_sheet.tsx`
- Modify: `app/frontend/components/pile_sheet.test.tsx`

**Approach:**
- Create `components/pile_sheet/` directory with `index.ts` barrel exporting only `PileSheet`
- Extract each sub-component family to focused files
- PileRecordItem is already fairly standalone — extract as-is
- Wantlist result/error/in-progress views all render under the same `AnimatePresence` — keep them together in `wantlist_views.tsx`
- WantlistHandoffAction + DisconnectedCta + ConnectedAccount share Discogs auth state — keep together in `wantlist_handoff.tsx`
- PileFooter model decomposition happens in U4

**Patterns to follow:**
- U1's crate_view module directory convention
- Existing record_card.tsx / record_tile.tsx — split of visual from interactive behavior

**Test scenarios:**
- Happy path: barrel import resolves — `import PileSheet from "./pile_sheet"` works
- Happy path: all pile sheet states (empty, populated, connected, disconnected, creating, success, error) render identically
- Edge case: PileRecordItem's remove button works after extraction
- Edge case: AnimatePresence mode="wait" transitions still function across file boundaries

**Verification:**
- All existing `pile_sheet.test.tsx` tests pass
- `components/pile_sheet.tsx` ≤ 120 lines (drops to orchestrator)

---

### U4. Decompose PileFooterModel data clump

**Goal:** Replace the 11-field PileFooterModel with focused domain objects, reducing PileFooter's interface to ≤4 props.

**Requirements:** R2, R3, R5

**Dependencies:** U3 (PileFooter extracted to its own file)

**Files:**
- Modify: `app/frontend/components/pile_sheet/pile_footer.tsx`
- Modify: `app/frontend/components/pile_sheet.tsx` (update PileSheet's construction of PileFooter props)

**Approach:**
- Split PileFooterModel into:
  - `PileHeaderInfo: { total, currency }` — the total display concern
  - `ShopperState: { isConnected, username, storeName, storeSlug }` — Discogs connection
  - `SubmissionState: { status, result, error }` — wantlist submission lifecycle
- PileFooter receives these smaller objects instead of one 11-field monolith
- The `showHandoffAction` / `showDisconnectedCta` / `showResult` derived booleans stay in PileSheet's composition — PileFooter just renders
- The `highlightOnMount` pulse logic stays in PileSheet and passes down as `animatePulse?: boolean` on the handoff CTA

**Patterns to follow:**
- Component decomposition that mirrors domain boundaries (PileSheet wants to know about connection state, not a flat 11-field object)
- The guard-parity checklist: verify each of the 6 footer states still renders correctly after model split

**Test scenarios:**
- Happy path: connected state shows ConnectedAccount and WantlistHandoffAction
- Happy path: disconnected state shows DisconnectedCta
- Happy path: creating state shows WantlistInProgressView
- Happy path: success state shows WantlistResultView
- Edge case: all 6 footer states produce correct output after model split
- Edge case: highlightOnMount pulse timing works through the decomposed interface

**Verification:**
- All existing pile_sheet tests pass
- PileFooter interface ≤ 4 props (replaced 2-proxy `{ model, actions }` with 3-4 focused props)

---

### U5. Collapse BackButton variant into separate components

**Goal:** Replace `BackButton`'s `variant: "icon" | "text"` with separate `IconBackButton` and `TextBackButton` components.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/back_button.tsx`
- Modify: `app/frontend/components/back_button.test.tsx`
- Modify: `app/frontend/components/crate_view/crate_header.tsx` (update import — IconBackButton)
- Modify: `app/frontend/layouts/app_layout.tsx` (update import — IconBackButton)
- Modify: `app/frontend/components/crate_view.tsx` (if it directly imports BackButton)

**Approach:**
- `BackButtonProps` becomes a union of two interfaces: `IconBackButtonProps` (just onClick + optional label + className) and `TextBackButtonProps` (same + required label)
- `IconBackButton` exports a focused component with just the circular ← button
- `TextBackButton` exports the "← Label" pill button
- Common focus-visible and aria-label patterns are extracted to a shared internal helper `sharedBackButtonClasses`
- Default export of `back_button.tsx` changes from `BackButton` to `IconBackButton` (the most commonly used variant) — or drop the default export entirely and require named imports
- Update all consumers to import the specific variant they need

**Patterns to follow:**
- `CrateShelfProps` discriminated union (`StaticCrateShelfProps | InteractiveCrateShelfProps`)
- The `actionClassName` helper pattern from `components/ui/action.tsx` — the shared button classes helper

**Test scenarios:**
- Happy path: IconBackButton renders circular ← button with correct aria-label
- Happy path: TextBackButton renders pill button with capitalised label
- Edge case: both variants render same focus-visible ring, hover colors, and transition
- Edge case: className override passes through to both variants

**Verification:**
- All existing back_button.test.tsx tests pass (update test imports to named variants)
- No consumers import `BackButton` from the default export (all use named exports)
- grep confirms zero remaining `BackButton({ variant: ` usage

---

### U6. Extract shared CrateSectionGrid from FeaturedCratesRow + GenreGrid

**Goal:** Eliminate duplication between FeaturedCratesRow and GenreGrid (near-identical components) by extracting a shared `CrateSectionGrid` primitive.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Create: `app/frontend/components/crate_section_grid.tsx`
- Modify: `app/frontend/components/featured_crates_row.tsx` (delegate to CrateSectionGrid)
- Modify: `app/frontend/components/genre_grid.tsx` (delegate to CrateSectionGrid)
- Create: `app/frontend/components/crate_section_grid.test.tsx`
- Modify: `app/frontend/components/featured_crates_row.test.tsx` (delegate tests)
- Modify: `app/frontend/components/genre_grid.test.tsx` (delegate tests)

**Approach:**
- CrateSectionGrid accepts: `{ title, count, crates: Crate[], variant: "featured" | "genre", onSelectCrate, columnCount }`
- `columnCount` is a function `(isCompact: boolean, isComfy: boolean) => number` — each variant provides its own column strategy
- FeaturedCratesRow becomes a thin wrapper: `export default function FeaturedCratesRow(props) { return <CrateSectionGrid title="Featured" columnCount={(c, cf) => c ? 1 : cf ? 2 : 3} {...props} /> }`
- GenreGrid becomes a similar thin wrapper with different title and column strategy
- Both original files stay as thin wrappers preserving the public import paths

**Patterns to follow:**
- `RecordTile` / `RecordCard` split — base primitive + feature wrapper
- Existing `useViewport()` consumption in both source files

**Test scenarios:**
- Happy path: CrateSectionGrid renders section header + responsive grid of CrateCards
- Happy path: FeaturedCratesRow wrapper produces identical output to the original
- Happy path: GenreGrid wrapper produces identical output to the original
- Edge case: columnCount function receives correct viewport tier values
- Edge case: empty crates array renders nothing (preserving `if (crates.length === 0) return null`)
- Edge case: title and count labels render correctly for both wrappers

**Verification:**
- All existing featured_crates_row.test.tsx and genre_grid.test.tsx tests pass
- CrateSectionGrid has its own co-located test file passing
- FeaturedCratesRow and GenreGrid are ≤ 15 lines each (thin wrappers only)

---

### U7. Reparent admin Discogs lookup to use shared hook

**Goal:** Eliminate the inline Discogs lookup state machine in admin/dashboard.tsx by using the existing `useDiscogsLookup` hook.

**Requirements:** R6

**Dependencies:** None (useDiscogsLookup already exists from first wave)

**Files:**
- Modify: `app/frontend/pages/admin/dashboard.tsx`
- Create: `app/frontend/test/pages/admin_dashboard.test.tsx` (or modify existing)

**Approach:**
- Replace the inline AbortController + fetch + state machine in `DiscogsOnboardingPanel` with `useDiscogsLookup`
- The admin panel needs status-specific UI (creatable, already_active, existing_applicant, invalid, api_error) — mirror the existing DiscogsSellerLookupInput pattern
- Extract LookupResult and LookupMessage as files under a new `components/admin/` directory (or keep internal to the page — evaluate at implementation time based on complexity)
- The csrfToken retrieval and form submission for onboarding remains — the hook handles the lookup, not the form submission
- Remove the inline `AdminDiscogsLookupResponse` type — use the existing `DiscogsLookupResult` from `types/inertia.ts`

**Patterns to follow:**
- DiscogsSellerLookupInput's use of `useDiscogsLookup` (consumes state, renders status branches via AnimatePresence)
- The admin panel will have different copy but the same rendering structure

**Test scenarios:**
- Happy path: entering a valid Discogs username shows creatable preview with onboarding form
- Happy path: entering an existing store username shows already_active status
- Happy path: entering an existing applicant username shows existing_applicant status
- Edge case: empty username shows invalid error without calling the hook
- Edge case: API error shows error message with retry option

**Verification:**
- All existing admin dashboard tests pass
- No inline AbortController or fetch calls remain in admin/dashboard.tsx
- Admin uses `useDiscogsLookup` from `hooks/use_discogs_lookup.ts`

---

### U8. Extract shared style factory and reduce CrateShelfLayout params

**Goal:** (a) Replace duplicate `compositedLayerStyle`/`activeLayerStyle` with a shared factory in motion_tokens. (b) Reduce CrateShelfLayout's 10+ destructured params to focused sub-objects.

**Requirements:** R3, R7

**Dependencies:** U1 (moves crate_view sub-components to module directory)

**Files:**
- Modify: `app/frontend/lib/motion_tokens.ts`
- Modify: `app/frontend/components/crate_view/card_stack.tsx` (replace inline style constants with factory call)
- Modify: `app/frontend/components/crate_view/active_record_card.tsx` (replace inline style constants)
- Modify: `app/frontend/components/crate_shelf.tsx` (reduce CrateShelfLayout params)

**Approach:**
- Add to `motion_tokens.ts`: `export function compositedLayer(contain = false): React.CSSProperties` returns the shared style object with optional `contain: "layout paint style"`. The non-contain variant matches `activeLayerStyle`.
- Update CardStack to import `compositedLayer` from motion_tokens instead of using inline constants
- For CrateShelfLayout: split the 10+ param destructuring into `ShelfLayoutProps` with sub-objects `{ crate, header: { ... }, grid: { cols, records, tactile } }` or similar domain grouping
- The `headerProps` rest-spread leak is fixed — HTML attribute spreading happens at the CrateShelfLayout call site, not as a param

**Patterns to follow:**
- Existing motion_tokens.ts export pattern (all named exports, no default)
- CrateShelf's existing discriminated union pattern

**Test scenarios:**
- Happy path: compositedLayer(true) returns style with contain property
- Happy path: compositedLayer(false) returns style without contain (matches activeLayerStyle)
- Happy path: CrateShelfLayout renders identically with restructured params
- Edge case: all existing hover/active animation behavior preserved

**Verification:**
- All existing crate_shelf.test.tsx and crate_view.test.tsx tests pass
- grep confirms zero remaining inline `compositedLayerStyle` or `activeLayerStyle` references
- CrateShelfLayout function signature ≤ 6 params (counting sub-objects as single params)

---

### U9. Consolidate PicksShelf viewport branching

**Goal:** Replace the three-component PicksShelf/CompactPicksShelf/DesktopPicksShelf viewport branching with a single component using layout slot composition.

**Requirements:** R4, R9

**Dependencies:** None

**Files:**
- Modify: `app/frontend/components/store_floor.tsx`
- Modify: `app/frontend/components/store_floor.test.tsx`

**Approach:**
- Remove CompactPicksShelf and DesktopPicksShelf as separate components
- PicksShelf renders the shelf content directly, gating only the viewport-specific motion wrapper
- The motion.div hover wrapper that DesktopPicksShelf adds for desktop becomes a conditional fragment in PicksShelf — only the wrapping `motion.div` differs between compact and desktop
- All guard conditions from both original branches are audited via the checklist

**Patterns to follow:**
- The `view ternaries, not conditional hooks` pattern from the codebase (`picksPreviewCount = isCompact ? 4 : 8`)
- Guard-parity audit checklist from docs/solutions/

**Test scenarios:**
- Happy path: compact tier renders shelf content without motion wrapper
- Happy path: desktop tier renders shelf content with motion hover wrapper
- Edge case: guard condition parity — every guard from both original branches present
- Edge case: useTactileHover only fires on desktop branch (not conditionally called — use a wrapping div or fragment)

**Verification:**
- All existing store_floor.test.tsx tests pass
- PicksShelf renders identically to the original for both compact and desktop viewports
- No duplicate components for viewport branching

---

### U10. Extract page module directories (admin/dashboard, home)

**Goal:** Reduce admin/dashboard.tsx (401 lines) and home.tsx (362 lines) by extracting internal sub-components.

**Requirements:** R1

**Dependencies:** U7 (admin Discogs lookup refactor)

**Files:**
- Create: `app/frontend/pages/admin/dashboard/index.ts`
- Create (extract from dashboard.tsx): `app/frontend/pages/admin/dashboard/discogs_onboarding_panel.tsx`
- Create (extract from dashboard.tsx): `app/frontend/pages/admin/dashboard/store_card.tsx`
- Create (extract from dashboard.tsx): `app/frontend/pages/admin/dashboard/applicant_card.tsx`
- Modify: `app/frontend/pages/admin/dashboard.tsx`
- Modify: `app/frontend/pages/home.tsx` (extract FeatureCard, StepCard as webpack-imported siblings or subcomponents)
- Modify: `app/frontend/test/pages/admin_dashboard.test.tsx`

**Approach:**
- Create `pages/admin/dashboard/` directory with barrel export
- Extract DiscogsOnboardingPanel, StoreCard, ApplicantCard to own files
- Dashboard becomes a ~80-line orchestrator
- For home.tsx: FeatureCard and StepCard become co-located files in a `pages/home/` directory — or remain in the same file since they are already small (FeatureCard ~10 lines, StepCard ~15 lines). Evaluate at implementation time. If combined they are <50 lines, keep in same file.
- Preserve all animation variant definitions — they stay in the file that owns them

**Patterns to follow:**
- U1 crate_view module directory convention
- U3 pile_sheet module directory convention

**Test scenarios:**
- Happy path: barrel import resolves for admin dashboard
- Happy path: admin dashboard renders with DiscogsOnboardingPanel, StoreCard, ApplicantCard
- Happy path: home renders FeatureCards and StepCards identically
- Edge case: admin empty states (no stores, no applicants) render correctly after extraction

**Verification:**
- All existing page tests pass
- admin/dashboard.tsx ≤ 100 lines
- home.tsx ≤ 200 lines (FeatureCard/StepCard remaining is acceptable)

---

## System-Wide Impact

- **Interaction graph:** CrateView's CardStack, CrateHeader, and CrateProgress are extracted to files but their import chain stays the same (consumed by CrateView). No external consumers change their imports.
- **Error propagation:** The admin Discogs lookup switches from inline error handling to useDiscogsLookup's state machine. The error surface UI is the same — just driven by a different state source.
- **State lifecycle risks:** CrateHeader's `layoutMode` enum replaces boolean pairs. Ensure all 3-mode combinations are tested — edge cases like `{ layoutMode: "compact", crates: [], activeSlug: "" }` must match the original boolean pair behavior.
- **API surface parity:** All public imports remain stable. `import CrateView from "@/components/crate_view"` still works because the barrel re-exports it.
- **Integration coverage:** Module directory extractions are purely organizational — no behavioral change. The guard-parity audit is the main risk area.
- **Unchanged invariants:** All Inertia page props, all API endpoints, all animation behavior, all aria attributes, all data-testid markers remain unchanged. The admin lookup behavior is the same — just driven by a shared hook instead of inline code.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Guard condition drift during CrateHeader prop refactor | Run guard-parity checklist (4 steps from docs/solutions/logic-errors/) after every branch change |
| Module directory barrel files break existing component imports | Create barrel and verify imports before moving sub-components. Run full test suite after each unit |
| PileFooter 6-state rendering regression after model split | Test all 6 states individually in pile_sheet.test.tsx before and after the split |
| Admin Discogs lookup behavior differs when switching to shared hook | Map existing `AdminDiscogsLookupResponse` statuses to `useDiscogsLookup` states. Test each mapping |
| BackButton variant consumers miss the refactor | grep for `BackButton` after refactor — ensure all imports updated |
| CrateShelfLayout param refactor breaks callers outside crate_view | Check all components importing CrateShelfLayout or CrateShelf which proxies to it |

---

## Sources & References

- Sandi Metz JS review findings: sandi-metz-js-review output (2026-05-28)
- First wave plan: `docs/plans/2026-05-27-001-refactor-frontend-sandi-metz-js-plan.md`
- Guard-parity: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
- Private helpers: `docs/solutions/best-practices/sandi-metz-refactor-helpers-stay-private-and-behavior-specs.md`
- Boolean inversion: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- Progressive migration: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
