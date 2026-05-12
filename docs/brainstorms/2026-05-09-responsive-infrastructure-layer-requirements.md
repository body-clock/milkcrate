---
date: 2026-05-09
topic: responsive-infrastructure-layer
---

# Responsive Infrastructure Layer

## Summary

A `ViewportContext` Provider + `useViewport()` hook that replaces the binary `useIsDesktop` with three named viewport tiers (compact/comfy/wide), exports the current tier as a CSS custom property for pure-CSS consumption, and ships with a test utility that lets tests exercise all three tiers directly. The responsive design token cascade is deferred to a follow-up.

---

## Problem Frame

The app has exactly one responsive mechanism: a `useIsDesktop()` hook that checks `(min-width: 768px)`. This means there is no tablet tier — an iPad Mini in portrait (744px) gets the cramped mobile layout, while a landscape iPhone (844px) gets a desktop layout it can't use well. Components that need viewport awareness either import `useIsDesktop` and write their own branching logic, or scatter ad-hoc `sm:` Tailwind classes with no `md:` or `lg:` fallback.

The test suite hardcodes `matchMedia` to always return `false`, so the desktop code path has zero test coverage. The motion system has a proven four-layer token architecture (tokens → provider → hook → wrappers) that makes animation consistency mechanical — responsive design has no equivalent.

Four files import `useIsDesktop` and branch on a boolean. Adding a tablet tier today would mean touching every one of those files to convert `if (isDesktop)` into a three-way switch, with no shared vocabulary for what the tiers mean.

---

## Actors

- A1. **Component author**: Uses `useViewport()` to write responsive behavior without defining breakpoints or registering `matchMedia` listeners.
- A2. **Test author**: Uses `setViewportTier(tier)` to render a component at a specific tier without mocking browser APIs.
- A3. **End user on a tablet or foldable**: Benefits from a layout tier between phone and desktop that didn't exist before.

---

## Key Flows

- F1. **Component queries the viewport tier**
  - **Trigger:** Component mounts or viewport crosses a tier boundary.
  - **Actors:** A1
  - **Steps:** Component calls `useViewport()` → hook reads the current tier from context → component branches on `tier`, `isCompact`, `isComfy`, or `isWide` → re-renders when the tier changes.
  - **Outcome:** Component renders the correct layout for the current viewport tier without owning any `matchMedia` listener.
  - **Covered by:** R1, R2, R3

- F2. **Test exercises a component at a specific tier**
  - **Trigger:** Test suite renders a component in a `describe.each` block or individual test.
  - **Actors:** A2
  - **Steps:** Test calls `setViewportTier('comfy')` before `render()` → component's `useViewport()` reads the injected tier from context → assertions validate comfy-tier behavior → subsequent tests set different tiers and assertions validate those.
  - **Outcome:** All three tiers are exercised in unit tests without any `matchMedia` mocking.
  - **Covered by:** R6, R7

- F3. **CSS consumes the viewport tier**
  - **Trigger:** Stylesheet loaded, or viewport tier changes.
  - **Actors:** A1 (authoring CSS)
  - **Steps:** Provider sets `--mc-viewport-tier: "compact"` on `:root` → CSS uses `[style*="--mc-viewport-tier: comfy"]` selectors or reads the value in `calc()` / custom properties → styles adapt without JS.
  - **Outcome:** Pure-CSS responsive behavior stays in sync with the JS tier.
  - **Covered by:** R4

- F4. **Existing useIsDesktop consumers are migrated**
  - **Trigger:** Author replaces `useIsDesktop()` import with `useViewport()`.
  - **Actors:** A1
  - **Steps:** Import changed → `isDesktop` boolean replaced with tier-aware comparison (`tier !== 'compact'` for old-desktop, `tier === 'wide'` for new-desktop-only, etc.) → old branches re-expressed in tier terms → old hook deleted after all 5 files migrated.
  - **Outcome:** Four production files + one test file use the new tier vocabulary; `use_is_desktop.ts` is removed.
  - **Covered by:** R8

---

## Requirements

### ViewportContext Provider

- R1. A `ViewportProvider` component wraps the app root (alongside `StorefrontMotionConfig` in `AppLayout`) and makes the current viewport tier available to all descendants via React context.
- R2. The provider defines three tiers with these boundaries:
  - **compact**: viewport width ≤ 767px
  - **comfy**: viewport width 768px – 1023px
  - **wide**: viewport width ≥ 1024px
- R3. The provider registers `matchMedia` listeners for the two boundary queries (`(min-width: 768px)` and `(min-width: 1024px)`) and updates the context when a boundary is crossed. Components re-render only when the tier changes, not on every resize event.

### useViewport Hook

- R4. A `useViewport()` hook returns `{ tier: 'compact' | 'comfy' | 'wide', isCompact: boolean, isComfy: boolean, isWide: boolean }`. The string `tier` is the authoritative value; the booleans are convenience derived values.
- R5. The hook reads from `ViewportContext`. It does not register its own `matchMedia` listener — the provider owns the subscription.

### CSS Custom Property

- R6. The provider sets a CSS custom property `--mc-viewport-tier` on `document.documentElement` (`:root`) with the value `"compact"`, `"comfy"`, or `"wide"`, updated whenever the tier changes.
- R7. The custom property name and values are stable — the token cascade follow-up will add additional responsive properties (`--mc-space-unit`, etc.) under the same namespace without changing this contract.

### Test Infrastructure

- R8. A `setViewportTier(tier: 'compact' | 'comfy' | 'wide')` test utility is exported from the test helpers. It wraps Testing Library's `render()` by injecting the specified tier directly into `ViewportContext`, bypassing browser `matchMedia` entirely.
- R9. A `describe.each` matrix or equivalent pattern runs at least one key test per component that branches on viewport tier across all three tiers, ensuring each tier's code path is exercised in CI.
- R10. The existing `matchMedia` mock in `test/setup.ts` is reviewed and updated so that it no longer masks the desktop code path. Tests that depend on the "always false" behavior are migrated to use `setViewportTier`.

### Migration

- R11. All five files that import `useIsDesktop` are migrated to `useViewport()`:
  - `app/frontend/layouts/app_layout.tsx` — header text label and link label
  - `app/frontend/components/store_floor.tsx` — picks wall layout branch
  - `app/frontend/components/crate_view.tsx` — disableFlip prop and details panel visibility
  - `app/frontend/components/pile_sheet.tsx` — side drawer vs. bottom sheet positioning
  - `app/frontend/components/storefront_shell.test.tsx` — test mock of `useIsDesktop`

  Each migration replaces `isDesktop` booleans with tier comparisons:
  - `isDesktop` → `tier !== 'compact'` (current desktop = comfy + wide)
  - `!isDesktop` → `tier === 'compact'` (current mobile = compact only)

  No behavioral changes are introduced during migration — the comfy tier inherits the old desktop behavior, which preserves existing tablet-width rendering.

- R12. After all call sites are migrated, `app/frontend/hooks/use_is_desktop.ts` is deleted.

### Existing CSS Breakpoint

- R13. The existing CSS `@media (min-width: 768px)` rule in `app/assets/tailwind/application.css` (lines 391–397, controlling `.mc-record-card` and `.mc-dig-stack` sizing) is left unchanged. It operates independently of the JS tier system. The CSS custom property `--mc-viewport-tier` is available for future CSS use but does not replace existing media queries.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R4.** Given a browser window at 800px width, when a component calls `useViewport()`, then it returns `{ tier: 'comfy', isCompact: false, isComfy: true, isWide: false }`.

- AE2. **Covers R1, R3.** Given a browser window resized from 800px to 500px, when the resize crosses 768px, then any component consuming `useViewport()` re-renders with `tier: 'compact'` and no other re-renders fire (the tier changed exactly once).

- AE3. **Covers R6.** Given `ViewportProvider` mounted at 800px width, when inspecting `document.documentElement` in DevTools, then `--mc-viewport-tier: "comfy"` is present and reads `"comfy"` via `getComputedStyle`.

- AE4. **Covers R8, R9.** Given a test calling `setViewportTier('wide')` before rendering `StoreFloor`, when the component renders, then the picks wall renders as a 6-column grid (the wide-tier behavior). No `window.matchMedia` mock is set up in the test file.

- AE5. **Covers R8, R10.** Given a test that previously mocked `useIsDesktop` to return `true` (as in `storefront_shell.test.tsx:96-122`), when migrated to use `setViewportTier('comfy')` or `setViewportTier('wide')`, then the same assertions pass without any `vi.mock` or `vi.mocked` call for the viewport hook.

- AE6. **Covers R11.** Given the `app_layout.tsx` header at 800px width, when the component renders, then the sub-label reads `"on Milkcrate"` (old `isDesktop` behavior, now `tier !== 'compact'`) and the link reads `"Discogs ↗"`.

- AE7. **Covers R12.** Given the migration is complete and all tests pass, when searching the codebase for `use_is_desktop` or `useIsDesktop`, then zero results are found.

---

## Success Criteria

- A new component added to the app can query the viewport tier by importing `useViewport` — no `matchMedia` listener, no hardcoded pixel value, no breakpoint definition.
- A test can exercise a component in compact, comfy, and wide tiers by changing one argument (`setViewportTier`) — no browser API mocking required.
- The tablet gap is closed: an iPad Mini in portrait (744px) renders the comfy (tablet) layout, not the compact (phone) layout.
- CI catches a regression in any tier's code path — a change that breaks the wide-tier picks wall is caught without manual browser testing.
- The deleted `use_is_desktop.ts` file is confirmed absent from the repo, and `useViewport` is the single idiomatic way to query the viewport tier.

---

## Scope Boundaries

- Responsive design token cascade (`--mc-space-unit`, `--mc-font-scale`, grid tokens per tier) — deferred to follow-up. The `--mc-viewport-tier` custom property contract is defined now so the cascade slots in without breaking changes.
- Container queries — separate concern; components may adopt `@container` independently of this infrastructure.
- Fluid typography via `clamp()` — deferred to the token cascade follow-up.
- Migration of ad-hoc `sm:` Tailwind classes in individual components — components adopt the hook organically; this infrastructure pass does not audit or rewrite component-level Tailwind usage.
- Tablet-specific layout designs for individual components — this infrastructure provides the tier vocabulary; per-component tablet layouts are application work.
- The existing CSS `@media (min-width: 768px)` rule in `application.css` — left untouched. It is a separate, CSS-only responsive rule for record card sizing.

---

## Key Decisions

- **Three tiers, not two or four**: Compact/comfy/wide maps naturally to phone/tablet/desktop. Four tiers (adding a phablet tier for 640-767px) adds complexity without a clear use case in the current component set. Two tiers is the status quo we're replacing.
- **768px and 1024px boundaries**: 768px preserves backward compatibility with the existing `useIsDesktop` threshold. 1024px is the standard tablet/desktop split and matches Tailwind's `lg:` breakpoint. These are hardcoded in the provider for now — external configuration is deferred.
- **Provider owns matchMedia; hook is passive**: The provider registers the listeners and updates context. The hook is a pure context read — no `ResizeObserver`, no `matchMedia`. This avoids per-component listener proliferation and makes the hook trivially testable.
- **Hook first, tokens later (Approach C)**: Shipping the provider + hook + test utility now validates the tier vocabulary and migration pattern with real usage. The token cascade is a clean follow-up that slots into the same provider and CSS custom property namespace.
- **Migration preserves behavior**: The comfy tier inherits old `isDesktop = true` behavior. No layout changes are introduced during migration — the comfy tier adds the tablet slot to the layout map without changing what renders at 768px+.
- **CSS custom property on `:root`, not a separate CSS file**: The provider sets `--mc-viewport-tier` imperatively via a side effect. Pure-CSS `@media` queries could define the same property declaratively, but the provider is the single source of truth for the tier — setting it from JS ensures CSS and JS never disagree about the current tier.

---

## Dependencies / Assumptions

- Tailwind CSS v4 with `@theme` directive (already in use) — the token cascade follow-up will use `@theme` to map CSS custom properties to utility classes.
- Framer Motion (already in use) — no dependency on the animation system, but the `ViewportProvider` placement alongside `StorefrontMotionConfig` follows the established pattern.
- Vitest + Testing Library (already in use) — the `setViewportTier` utility wraps `render()` from Testing Library.
- The existing CSS `@media (min-width: 768px)` rule is not a migration dependency — it operates independently and is left unchanged.

---

## Outstanding Questions

### Resolve Before Planning

(None — all scope-shaping decisions are resolved.)

### Deferred to Planning

- [Affects R3][Technical] Should the provider use `matchMedia` with `addEventListener` (modern API) or `addListener` (broader compat)? The existing `useIsDesktop` hook already uses the modern API — planning can confirm and standardize.
- [Affects R9][Technical] Which components need the full `describe.each` matrix, and which can assert a single tier? The migration covers the 4 production consumers; planning identifies additional components with viewport-dependent behavior.
- [Affects R10][Needs research] Does the existing `matchMedia` mock in `test/setup.ts` need to be removed entirely, or kept as a safety net for third-party code that calls `matchMedia` directly? Planning determines the safest approach.
