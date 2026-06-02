---
title: "ViewportContext responsive architecture — replacing binary useIsDesktop with named tiers"
date: 2026-05-09
last_updated: 2026-06-02
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - Adding cross-cutting viewport-aware behavior to React components
  - Migrating from a binary breakpoint hook to a multi-tier system
  - Establishing a shared viewport vocabulary across JS and CSS
  - Adding responsive test coverage without matchMedia mocking
tags: [viewport, responsive, breakpoint, react-context, framer-motion, typescript, testing, hydration, animation, touch]
---

# ViewportContext Responsive Architecture

## Context

The app had a single responsive mechanism: `useIsDesktop()` — a hook returning `true` at ≥768px. Four components branched on this boolean with no shared vocabulary. Test coverage was `matches: false` only — the desktop code path had zero CI coverage. The code review from session `f9d7be8f` had already identified that CSS `md:` breakpoints were the right tool for layout and JS hooks were the wrong one, and `FeaturedCratesRow` was already migrated to pure Tailwind. `StoreFloor` was the last holdout.

The animation token system (`storefront-animation-token-system-2026-05-08.md`) established a proven four-layer architecture: tokens → provider → hook → wrappers. The responsive system mirrors this pattern.

## Guidance

### Layer 2 — ViewportProvider

Place at the app root alongside `StorefrontMotionConfig` and `PileProvider`. Register `matchMedia` listeners for the two boundary queries (768px and 1024px). Set a CSS custom property `--mc-viewport-tier` on `:root` for pure-CSS consumers. The provider is the single source of truth; no component registers its own listener.

```tsx
// app/frontend/contexts/viewport_context.tsx
export function ViewportProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<ViewportTier>(() =>
    typeof window === "undefined" ? "compact" : tierFromWidth(window.innerWidth)
  )

  useEffect(() => {
    const compactQuery = window.matchMedia(`(max-width: ${COMPACT_MAX}px)`)
    const comfyQuery = window.matchMedia(
      `(min-width: ${COMPACT_MAX + 1}px) and (max-width: ${COMFY_MAX}px)`
    )
    const sync = () => setTier(tierFromWidth(window.innerWidth))
    compactQuery.addEventListener("change", sync)
    comfyQuery.addEventListener("change", sync)
    return () => {
      compactQuery.removeEventListener("change", sync)
      comfyQuery.removeEventListener("change", sync)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--mc-viewport-tier", `"${tier}"`
    )
  }, [tier])

  return (
    <ViewportContext.Provider value={{ tier }}>
      {children}
    </ViewportContext.Provider>
  )
}
```

Three tiers: **compact** (≤767px), **comfy** (768–1023px), **wide** (≥1024px). The 768px boundary preserves backward compatibility with the old `useIsDesktop` threshold. The 1024px boundary aligns with Tailwind's `lg:` breakpoint. Named constants `COMPACT_MAX = 767` and `COMFY_MAX = 1023` are extracted from inline numbers for clarity and maintainability.

### Layer 3 — useViewport Hook

A pure context read — no `matchMedia`, no `ResizeObserver`. Returns both the string tier and convenience booleans:

```ts
export function useViewport(): UseViewportResult {
  const { tier } = useViewportContext()
  return {
    tier,
    isCompact: tier === "compact",
    isComfy: tier === "comfy",
    isWide: tier === "wide",
  }
}
```

### CSS Custom Property

Set on `:root` by the provider. CSS can consume it via attribute selectors or `var()`:

```css
[style*='--mc-viewport-tier: "compact"'] .mc-section-header {
  font-size: 0.875rem;
}
```

### Test Utility

Bypass `matchMedia` entirely in tests by injecting the tier directly:

```tsx
// app/frontend/test/viewport-test-utils.tsx
export function renderWithTier(
  tier: ViewportTier,
  ui: ReactNode,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ViewportContext.Provider value={{ tier }}>
        {children}
      </ViewportContext.Provider>
    ),
    ...options,
  })
}
```

A `TierWrapper` helper is also available for test files that need both viewport context and tier rendering in a single import — it avoids duplicating the `ViewportContext.Provider` wrapper when combined with other test utilities.

### Migration Pattern

1. Wire `ViewportProvider` into `AppLayout` first — **before any consumer calls `useViewport()`**. The animation migration hit this bug: the provider was built but never added to the component tree, causing runtime throws in tests (hidden because `matchMedia` mock always returned `false`). Write a smoke test that renders `AppLayout` and asserts the hook returns a tier.
2. Replace `useIsDesktop` imports with `useViewport` at each call site.
3. Replace `isDesktop` booleans with tier comparisons: `isDesktop` → `tier !== 'compact'`, `!isDesktop` → `tier === 'compact'`.
4. Delete `use_is_desktop.ts` after all call sites are migrated.
5. Add `describe.each` matrix using `renderWithTier` for components that branch on viewport.

## Bugs Encountered During Migration

### Nested Button Hydration Errors

**Symptom:** React hydration warning: `<button>` cannot be a descendant of `<button>`.

**Root cause:** Three components had button nesting:
- `CrateCard`: outer `motion.button` (Framer Motion) wrapping thumbnail `<button>` elements
- Picks wall desktop grid: `<button>` wrapper around `TactileCard` + `RecordCard`, whose back face contains pile/add `<button>` elements

**Fix:** Replace outer `<button>` / `motion.button` with `<div>` (or `motion.div`) using `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler for Enter/Space. Match the established `RecordCard` pattern which already uses this approach for its flip interaction.

```tsx
// Before (invalid HTML)
<motion.button onClick={...}>
  <button onClick={...}>Thumbnail</button>
</motion.button>

// After
<motion.div
  role="button"
  tabIndex={0}
  onClick={...}
  onKeyDown={(e) => {
    if ((e.target as HTMLElement).closest("button, a")) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick()
    }
  }}
>
  <button onClick={...}>Thumbnail</button>
</motion.div>
```

**Prevention:** Any element that needs to be clickable AND contain interactive children must use `role="button"` on a `<div>`, not a `<button>` element. This applies to motion components too — `motion.button` renders as `<button>`.

### PileSheet Animation Swap

**Symptom:** After `useIsDesktop` → `useViewport` migration, the PileSheet rendered as a side drawer on mobile and a bottom sheet on desktop — the reverse of intended behavior.

**Root cause:** `isDesktop == true` meant "desktop" and triggered the side drawer. The replacement `isCompact == true` means "mobile" but was mistakenly used in the same position without inverting the logic. Both `className` and `initial`/`animate`/`exit` animation directions were swapped.

**Fix:** The correct mapping:
```tsx
// Correct: compact → bottom sheet, desktop → side drawer
className={isCompact
  ? "fixed bottom-0 left-0 right-0 ... rounded-t-2xl"  // bottom sheet
  : "fixed top-0 right-0 bottom-0 ... w-96"            // side drawer
}
initial={isCompact ? { y: "100%" } : { x: "100%" }}
animate={isCompact ? { y: 0 } : { x: 0 }}
exit={isCompact ? { y: "100%" } : { x: "100%" }}
```

**Prevention:** When migrating boolean hooks to inverted boolean hooks, audit every ternary — not just the import. `isDesktop ? X : Y` becomes `isCompact ? Y : X`, not `isCompact ? X : Y`.

### Touch Hover Flash on Genre Crates

**Symptom:** When touching a crate card on mobile and starting to scroll, the card briefly flashed with hover effects (border highlight, scale, lift) for one frame.

**Root cause:** `useTactileHover` set `proximity = 1` on touch `pointerenter`, triggering `isHovered = true` and the crate card's hover animation. The scroll gesture then immediately cancelled the pointer (`pointerleave`), reversing the animation. Net effect: one-frame flash.

**Fix:** Touch devices don't need hover proximity effects — they only need press state (`isPressed`). The intended fix was to set `proximity = 0` on touch enter, preventing the hover animation from activating:

```ts
// Intended fix (not yet applied as of 2026-05-14)
if (reducedMotion || isTouch) {
  setProximity(0)  // no hover for touch — press state handles feedback
  return
}
```

**This fix has been applied** as of 2026-05-14. The code now correctly sets `proximity(0)` on touch enter:

```ts
if (reducedMotion || isTouch) {
  setProximity(0)  // no hover for touch — press state handles feedback
  return
}
```

**Prevention:** When adding hover effects to interactive elements, gate them on `pointerType !== "mouse"` or use the `any-hover: hover` media query. Touch devices should get press-state feedback only.

### Picks Wall Flip Decision

**Symptom:** The `RecordCard` back face (title, artist, genres, price, pile/add button, Discogs link) was illegible on the small square cards in the picks wall grid (2–5 columns).

**Decision:** Disable flip on picks wall cards. Tapping a wall card navigates directly into `CrateView` at that record's position, where cards are larger and the back face works. The picks wall is for cover browsing; CrateView is for detail access.

**Implementation:** Pass `disableFlip` to `RecordCard` and wrap in a clickable `div` with `role="button"` that calls `onSelectCrate("picks", index)`.

## Why This Matters

The `useIsDesktop` boolean was a single point of architectural drift. Adding a tablet tier would have meant touching every component that branched on `isDesktop` and converting it to a three-way switch with no shared vocabulary. `ViewportContext` makes viewport awareness a property of the environment, not a per-component decision. New components inherit responsive behavior by importing `useViewport` — no breakpoint definition, no `matchMedia` listener, no hardcoded pixel value.

The test infrastructure gap was the compounding risk: zero desktop-code-path coverage meant every responsive change was a blind push. `renderWithTier` makes cross-tier testing a one-line utility call, closing a CI coverage gap that had existed since the app's first responsive component.

The nested button pattern is a recurring React hydration trap — any clickable wrapper around interactive children must use `role="button"` on a `<div>`, never `<button>` or `motion.button`. The three instances found (CrateCard, picks wall, and the pre-existing RecordCard pattern) suggest this deserves a lint rule or code review checklist item.

## When to Apply

- When adding any cross-cutting state that multiple components need (viewport tier, theme, reduced motion) — use the provider + hook pattern
- When migrating from a binary abstraction to a multi-value one — audit every ternary at every call site, not just the imports
- When adding responsive test coverage — use context injection (`renderWithTier`), not browser API mocking
- When wrapping interactive children in a clickable container — use `role="button"` on `<div>`, never `<button>`

## Testing Conventions Added in 2026-05-14

The vendor brand unification plan (U9: responsive governance) established two additional testing patterns that extend `renderWithTier`.

### Cross-Surface Responsive Matrix

When multiple surfaces share a viewport vocabulary, add a single test matrix that renders every surface at every tier. This catches missing-provider errors, tier-based crashes, and viewport-context issues in one compact block.

```tsx
// app/frontend/test/pages/responsive_surface_matrix.test.tsx
import { renderWithTier } from "@/test/viewport-test-utils"

const tiers = ["compact", "comfy", "wide"] as const

describe("responsive surface matrix", () => {
  describe.each(tiers)("%s tier", (tier) => {
    it("renders the home page without crashing", () => {
      const { container } = renderWithTier(tier, <Home ... />)
      expect(container).toBeTruthy()
    })
    it("renders the apply page without crashing", () => {
      const { container } = renderWithTier(tier, <Apply ... />)
      expect(container).toBeTruthy()
    })
    it("renders the store page without crashing", () => {
      const { container } = renderWithTier(tier, <Featured ... />)
      expect(container).toBeTruthy()
    })
  })
})
```

The matrix is structural smoke, not visual testing. Each test renders the surface and asserts it mounts and shows core content (heading, empty state). Visual snapshot tests are too brittle for responsive governance; this pattern gives CI-level protection against provider regressions without pixel-level flakiness.

**The matrix pattern has since grown.** The actual `responsive_surface_matrix.test.tsx` now includes additional scenarios beyond the basic smoke test: live preview data, submitted/confirmation state, and populated crates. The pattern remains the same (`describe.each` + `renderWithTier`), but the file is more comprehensive than the simplified example shown.

**Provider-stripping pattern for heavy wrappers:** Surfaces that render inside `AppLayout` (which creates its own `ViewportProvider`) need the layout mocked out so `renderWithTier`'s injected tier propagates. Mock `AppLayout` to render children directly, and mock `StorefrontMotionConfig` to supply `useReducedMotionContext`:

```tsx
vi.mock("@/layouts/app_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@/components/storefront_motion_config", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotionContext: () => false,
}))
```

### Emoji Regression Test Matrix

After replacing emoji-based branding with a React component (`BrandMark`), add a cross-surface matrix that asserts no public page renders the old emoji wordmark or individual emoji glyphs. Future pages are added to the matrix as they're created.

```tsx
describe.each([
  ["home", () => render(<Home ... />)],
  ["apply", () => render(<Apply ... />)],
  ["store", () => render(<Featured ... />)],
])("emoji regression: %s page", (_label, renderPage) => {
  it("does not render the milk emoji (🥛)", () => {
    renderPage()
    expect(document.body.textContent).not.toContain("🥛")
  })
  it("does not render the old emoji wordmark (🥛 Milkcrate)", () => {
    renderPage()
    expect(document.body.textContent).not.toContain("🥛 Milkcrate")
  })
})
```

**The actual emoji regression test** has expanded beyond the simplified example above. `page_smoke.test.tsx` now checks for multiple emoji characters (`🥛`, `📀`, `👀`, `📦`) across all public surfaces, and `brand_mark.test.tsx`, `apply.test.tsx`, and `home.test.tsx` have additional emoji checks specific to their components.

### Accessibility Landmark Governance

A companion accessibility test verifies shell invariants across all surfaces: exactly one `<main>` landmark with `id="main-content"`, a skip-link targeting it, and no `<button>` elements nested inside other `<button>` elements in shared primitives.

## Related

- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` — the four-layer architecture this pattern mirrors
- `docs/brainstorms/2026-05-09-responsive-infrastructure-layer-requirements.md` — requirements doc for the ViewportContext work
- `docs/plans/2026-05-09-mobile-first-design-plan.md` — full implementation plan (IU-1 is the ViewportContext unit)
- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — the strategy-object → factory → enforcement meta-pattern that inspired the token architecture