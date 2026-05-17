---
title: "Vendor brand and responsive surface system — shared brand, shell, and primitives"
date: 2026-05-14
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: frontend
severity: medium
applies_when:
  - Extending the Milkcrate public-facing visual identity
  - Adding a new public-facing page or surface
  - Changing the header, footer, or skip-link across multiple layouts
  - Adding new record/crate display elements that should share the visual language
  - Auditing responsive behavior across marketing, store, and admin surfaces
tags: [brand, shell, primitives, responsive, viewport, emoji, design-tokens, accessibility, testing, guard-parity]
---

# Vendor Brand and Responsive Surface System

## Context

Milkcrate had three separate surface families — marketing (home, apply), store browsing (Featured, StoreFloor, CrateView), and admin (Rails ERB) — each with its own header treatment, emoji-based branding (`🥛 Milkcrate`), and responsive behavior. The animation token system (`storefront-animation-token-system-2026-05-08.md`) unified animation values but the visual identity and layout shared no common vocabulary.

The vendor brand unification plan (2026-05-14) replaced this with a three-layer system: a single brand mark (U1), a shared shell contract (U2), and composable preview primitives (U3). Every public surface — marketing, store, crate, apply, and admin — now uses the same brand tokens and responsive vocabulary while keeping its own content and behavior decisions.

## Pitfalls from Implementation

These issues were discovered during the implementation of the vendor-brand system and are worth knowing when extending or modifying it (session history):

1. **Conditional hook violation in `StorefrontPreview`** — `useViewport()` was called conditionally (`hasProvider ? useViewport() : ...`), violating React's rules of hooks. This also masked integration issues by fabricating a default tier state. **Fix**: Remove the conditional path; always call `useViewport()` and wrap `MarketingLayout` with `ViewportProvider` so all surfaces have context. Missing context should be a compile-time/test-time failure, not silent degradation.

2. **`variants` on plain HTML elements** — `variants={fadeUp}` was placed on a plain `<h2>`, so the animation had no effect. **Fix**: Changed to `motion.h2`. Always verify that Framer Motion `variants` props target `motion.*` elements.

3. **ViewportProvider runtime crash** — After fixing the conditional hook, the component always required viewport context, but `MarketingLayout` wasn't providing it, causing a runtime crash (`useViewportContext must be used within a ViewportProvider`). **Fix**: Wrapped `MilkcrateShell` in `MarketingLayout` with `ViewportProvider`.

4. **Binary `useIsDesktop()` hydration flicker** — The old binary hook caused server/client mismatches. Replaced with Tailwind responsive classes or `useViewport()`. Do not re-introduce binary responsive hooks.

5. **Inline spring values** — Apply confirmation used inline `{ type: 'spring', stiffness: 300, damping: 26 }`. **Fix**: Replaced with imported `springTactile` token from `@/lib/motion_tokens`.

## Guidance

### Layer 1 — Brand Mark (`BrandMark`)

A single React component that renders the Milkcrate crate-plus-record silhouette (SVG) and optional wordmark text. Two sizes: `"small"` (header) and `"large"` (hero/confirmation). CSS custom properties make it theme-aware without hard-coded colors.

```tsx
// app/frontend/components/brand_mark.tsx
export default function BrandMark({
  size = "small",
  showWordmark = true,
  className,
}: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg width={size === "large" ? 40 : 24} height={...} aria-hidden={showWordmark ? "true" : undefined}>
        {/* Crate front + record disc SVG layers */}
      </svg>
      {showWordmark && (
        <span className="mc-wordmark font-bold tracking-widest uppercase">
          Milkcrate
        </span>
      )}
    </span>
  )
}
```

Static icon assets (`public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`) use the same crate-plus-record geometry with fixed dark-mode colors for surfaces that can't use CSS variables (favicon, PWA manifest). The manifest (`public/manifest.json`) now carries `"icons"` entries for both sizes.

**When to use `BrandMark`:** In every header and surface attribution. The SVG is the single visual identity; do not create variant marks unless there is a product reason for separate visual identities (e.g., a subsidiary store brand).

**When NOT to use `BrandMark`:** Inside store browsing pages where a specific store's name is the primary header attribution. `AppLayout` already handles this: it shows the store name when `storeName` is present and falls back to `BrandMark` for the Milkcrate root path.

### Layer 2 — Shared Shell (`MilkcrateShell`)

A thin compositional layout component that provides the consistent skeleton — skip-link, header region, main content wrapper with configurable max-width, and optional footer. It is NOT a mega-layout. It is a regional container that each semantic layout (`MarketingLayout`, `AppLayout`) slots its own content into.

```tsx
// app/frontend/layouts/milkcrate_shell.tsx
export interface MilkcrateShellProps {
  header: React.ReactNode          // required: brand mark, nav, theme toggle
  afterHeader?: React.ReactNode    // optional: flash notices
  children: React.ReactNode        // required: page content → <main>
  footer?: React.ReactNode         // optional: attribution, links
  contentWidth?: string            // Tailwind max-w-* (default: max-w-6xl)
  contentPadding?: string          // Tailwind padding (default: px-4 sm:px-6 lg:px-8 py-6 sm:py-12)
}
```

**MarketingLayout** uses the shell with a centered header, no footer, and default content width:

```tsx
export default function MarketingLayout({ children }) {
  const { theme, toggle } = useTheme()
  return (
    <MilkcrateShell
      header={<header><BrandMark /> <ThemeToggle /></header>}
    >
      {children}
    </MilkcrateShell>
  )
}
```

**AppLayout** uses the shell with a sticky store-aware header, flash notices in `afterHeader`, a `"Powered by Milkcrate"` footer, and store-specific content padding. It wraps the shell in `StorefrontMotionConfig > ViewportProvider > PileProvider` so store browsing children get motion, viewport, and pile context.

**When to extend the shell:** Add a new region slot (e.g., `beforeFooter`). Keep it a slot — do not bake page-specific logic into the shell.

**When NOT to use the shell:** Non-public pages that should intentionally look different from the main surfaces (e.g., a dedicated checkout flow, a micro-site, or an iframe embed). The shell is for surfaces that share the Milkcrate identity.

### MarketingPreviewPresenter — Bounded Preview Data

The homepage uses `MarketingPreviewPresenter` (backend) to bound the preview payload: `MAX_PREVIEW_RECORDS = 4`, `MAX_FEATURED_CRATES = 2`, `MAX_GENRE_CRATES = 2`. This prevents shipping an unbounded store payload. It uses `StorefrontCuration` and `CratePresenter` for serialization and falls back to typed data when no demo store exists — the homepage renders correctly without a synced local database.

When adding new section types to `StorefrontPreview`, update both the presenter caps and the fallback data.

### Layer 3 — Preview Primitives (`RecordTile`, `CrateShelf`, `StorefrontPreview`)

Three composable React components that create a shared visual language for record covers and crate displays:

| Component | Purpose | Interactive mode |
|-----------|---------|-----------------|
| `RecordTile` | Lightweight, non-interactive cover display. Image or ♪ placeholder. | Never |
| `CrateShelf` | Crate header + 2-column record grid. Two modes. | `interactive={true}`: clickable header + thumbnails call `onSelectCrate`. `interactive={false}`: static display. |
| `StorefrontPreview` | Section-level preview: picks wall, featured crates, genre grid. Responsive grids per tier. | Links in "interactive" variant; otherwise decorative. |

**`RecordTile`** is the building block. It replaces the duplicated `{src ? <img> : <div>♪</div>}` pattern that appeared in CrateCard, StoreFloor compact scroll, and the old homepage decorative crates. `RecordCard` remains the full flip/detail component for CrateView and pile interactions.

**`CrateShelf`** is the crate-level building block. In interactive mode, it follows the same `role="button"` pattern as `CrateCard` — keyboard-accessible, closest-check for nested interactive elements. In non-interactive mode, it renders the same visual structure without clickable elements — useful for marketing preview sections.

**`StorefrontPreview`** composes `RecordTile` and `CrateShelf` into section-level preview layouts with tier-aware grids (compact: 2-col carousel; comfy: responsive grid; wide: full-width grid).

**When to use primitives:** Any surface that displays records or crates visually. Marketing pages use non-interactive mode. Store browsing surfaces use interactive mode.

**When NOT to use primitives:** `RecordCard` and `CrateCard` remain for product surfaces that need richer interaction — record flip animation, tactile hover, coordinated multi-element animation. The primitives are for shared visual display; the specialized components are for interactive behavior.

### Guard-Parity Audit Checklist

When refactoring a component that has responsive branches (`isCompact`, `isComfy`, `isWide`), audit every render site for guard-condition parity across all branches. This is the learning from the responsive branching bug doc (`responsive-branching-guard-condition-drift-2026-05-13.md`).

```
1. Find every guard condition on the original render path
   (prop gates: !hideTabs, data gates: records.length > 0, permission gates)
2. Verify each guard appears on every new branch
   (compact path, non-compact path, and any intermediate tiers)
3. Check the empty/error state paths separately
   (they often have their own branching)
4. Test every branch with the guard condition active
   (e.g., hideTabs={true} on a desktop viewport)
```

## Why This Matters

- **Single identity.** One `BrandMark` propagates to React headers, ERB layouts, favicon, PWA manifest, and social surfaces without per-surface emoji hunting.
- **Layout drift is mechanically prevented.** The shell is a contract — every surface gets the same skip-link, header region, and content wrapper. No layout can accidentally replace or drop the skip-link because it doesn't own that concern.
- **Visual language is composable.** Marketing can use the same `RecordTile` as store browsing without importing `StoreFloor`'s full interaction model. Primitives separate "what it looks like" from "what it does."
- **Responsive governance is CI-enforceable.** The cross-surface matrix (`responsive_surface_matrix.test.tsx`) and emoji regression matrix (`page_smoke.test.tsx`) catch provider-stripping regressions and emoji re-introductions before they reach review.

## When to Apply

- When adding a new public-facing page — use `MarketingLayout` or `AppLayout` (which use `MilkcrateShell` + `BrandMark`). Add the page to the responsive matrix.
- When changing the header structure across surfaces — modify `MilkcrateShell`'s slot interface, not individual layouts.
- When displaying records/crates outside of `StoreFloor` — use `RecordTile`/`CrateShelf`/`StorefrontPreview` instead of copying the visual pattern.
- When refactoring a responsive branch — run the guard-parity checklist before merging.
- When the brand mark evolves — update `BrandMark` and the static icon assets together; the single-source-of-truth principle means one component change propagates.

## Related

- `docs/plans/2026-05-14-001-feat-vendor-brand-responsive-surfaces-plan.md` — full implementation plan (9 units)
- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` — the viewport tier system the shell depends on
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` — the four-layer token/provider/hook/wrapper architecture that parallels the brand/shell/primitive system
- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — the strategy-object pattern for backend curation (homepage preview reuses this)
- `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` — the guard-parity bug that this system's audit checklist prevents
- Commits: `00c39e3` (U1: brand mark), `e37cce9` (U2: shell), `ca4df5f` (U3: primitives), `faa4b0f` (U6: homepage), `e87bdca` (U7: apply), `2e1aa34` (U8: admin)
