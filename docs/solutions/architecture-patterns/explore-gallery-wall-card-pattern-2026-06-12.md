---
title: "Explore page gallery-wall redesign — token migration, component extraction, and card patterns"
date: 2026-06-12
category: architecture-patterns
module: storefront
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding a new page to the MilkCrate frontend that needs to follow the mc-* design token system"
  - "Refactoring a React component that violates max-lines-per-function: 25, jsx-max-depth: 3, or no-multi-comp"
  - "Building image-dominant card layouts with gradient overlays and fallback content"
  - "Adding entry animations to a grid layout using Framer Motion"
tags:
  - design-tokens
  - component-extraction
  - lint-rules
  - gallery-wall
  - framer-motion
  - accessibility
  - card-pattern
---

# Explore Page Gallery-Wall Redesign — Token Migration, Component Extraction, and Card Patterns

## Context

The explore page (`/explore`) was initially built as a plain directory of record stores using generic Tailwind `stone-*` classes. It was functionally complete but visually disconnected from the MilkCrate design system — a contact list rather than a discovery experience. The redesign needed to:

1. **Replace all `stone-*` Tailwind classes** with `mc-*` design tokens for theme consistency
2. **Create image-dominant featured cards** with text overlays readable over any avatar background
3. **Satisfy strict lint rules** (`max-lines-per-function: 25`, `jsx-max-depth: 3`, `no-multi-comp`, `no-magic-numbers`) that forced component decomposition
4. **Add motion** — staggered entrance animations using the existing Framer Motion token library
5. **Achieve uniform card height** in a responsive grid layout

This document captures the patterns and pitfalls encountered during the redesign.

## Guidance

### 1. Design Token Migration: `stone-*` → `mc-*`

The MilkCrate design system defines ~30 `mc-*` semantic color tokens via Tailwind v4's `@theme inline` directive in `app/assets/tailwind/application.css`. These include background, text, accent, border, and feedback role colors, plus the Spectral serif typeface.

**Token mapping for card components:**

| Usage | Old (`stone-*`) | New (`mc-*`) |
|-------|----------------|--------------|
| Primary text | `text-stone-700` / `text-stone-300` (dark) | `text-mc-text` |
| Muted text | `text-stone-500` / `text-stone-400` (dark) | `text-mc-text-dim` |
| Card background | `bg-stone-100` / `bg-stone-800` (dark) | `bg-mc-bg-card` |
| Border | `border-stone-200` / `border-stone-700` (dark) | `border-mc-border` |
| Raised background | `bg-stone-100` / `bg-stone-800` (dark) | `bg-mc-bg-raised` |

**Key insight:** The old code had separate light/dark class pairs everywhere (`text-stone-500 dark:text-stone-400`). The `mc-*` tokens auto-switch between themes via CSS custom properties — a single class like `text-mc-text-dim` handles both themes. This eliminates the `dark:` modifier noise.

**What the design system linter (`scripts/lint-design-system-tokens.ts`) enforces:**
- Bans deprecated CSS utility classes (`mc-btn`, `mc-input`, `mc-text`, `mc-border`, etc.) in React TSX
- Bans raw palette utilities (`text-red-500`, `bg-emerald-100`) — must use `mc-feedback-*` semantic roles
- Bans `focus-visible:ring-mc-accent` — must use `focus-visible:ring-mc-focus` for contrast

### 2. Component Extraction for Strict Lint Rules

The project enforces four lint rules that together force a specific component decomposition:

| Rule | Limit | What it forces |
|------|-------|----------------|
| `max-lines-per-function` | 25 lines | Functions (including React components) must be ≤25 lines |
| `jsx-max-depth` | 3 levels | Maximum JSX element nesting depth of 3 |
| `no-multi-comp` | 1 per file | Each file may export only one React component |
| `no-magic-numbers` | No inline numbers | Slice counts, durations, etc. must be named constants |

**Resulting decomposition pattern:** Each card in the explore page decomposes into 3-4 single-component files:

```
store_card.tsx                  # Link wrapper (composition, ~18 lines)
├── store_card_image.tsx        # Image or null (1 conditional branch, ~14 lines)
└── store_card_info.tsx         # Text content (flex-1 column, ~25 lines)
```

**Extracted class constants pattern:** Long className strings that cause JSX wrapping (exceeding the 80-char line width) are extracted to module-level constants:

```tsx
// Instead of inline className that wraps awkwardly:
<span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-xs text-white backdrop-blur-sm">

// Extract to a module-level constant:
const GENRE_PILL_CLASS =
  "inline-block rounded-full bg-white/25 px-2 py-0.5 text-xs text-white backdrop-blur-sm";
```

**Helper function pattern (pure, co-located):** Small helper functions that format display data are kept in the same file rather than extracted to shared utils:

```tsx
function storeListingText(total: number | null): string {
  if (total == null) {
    return "Listings coming soon";
  }
  return `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`;
}
```

This avoids adding barrel imports for one-liners. The same function is duplicated across `featured_card_content.tsx` and `store_card_info.tsx` — acceptable duplication given the lint-function-line savings.

### 3. Gallery-Wall Card Pattern

Two card variants emerged — featured (hero, image-dominant) and standard (grid listing). Both share `rounded-lg`, `border-mc-border`, and `group` for coordinated hover effects.

**Featured card structure** (`featured_card.tsx`):

```tsx
<motion.div variants={fadeUp}>
  <Link href={`/${store.discogs_username}`} className="group relative block overflow-hidden rounded-lg shadow-lg ...">
    <div className="relative aspect-[4/5] w-full">
      <FeaturedCardImage store={store} />
      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <FeaturedCardContent store={store} />
    </div>
  </Link>
</motion.div>
```

**Gradient overlay** — The critical accessibility decision: `from-black/85` (85% black at the bottom where text sits) ensures white text meets WCAG AA contrast over any avatar image. Text opacities are bumped accordingly (`text-white`, `text-white/90`, `text-white/80`). A `backdrop-blur-[1px]` on the content container provides additional insurance.

**Fallback for missing avatars** — When no `avatar_url` exists, the featured card renders the store name's first letter centered in the card area:

```tsx
{store.avatar_url ? (
  <img src={store.avatar_url} alt={store.name} className="object-cover ..." />
) : (
  <div className="flex h-full items-center justify-center text-mc-text-dim">
    <span className="font-mc text-4xl">{store.name.charAt(0)}</span>
  </div>
)}
```

**Standard card with uniform height** (`store_card.tsx`):

```tsx
<Link href={`/${store.discogs_username}`}
  className="group flex h-full flex-col overflow-hidden rounded-lg border border-mc-border shadow-sm ...">
  <StoreCardImage store={store} />
  <StoreCardInfo store={store} />
</Link>
```

The flex column (`flex h-full flex-col`) inside `auto-rows-fr` grid rows makes every card the same height. The listing count uses `mt-auto` to pin to the bottom of each card, creating a consistent visual baseline. The info area uses `flex-1` to grow and fill remaining space.

### 4. Motion Pattern

Both grids use the same staggered entrance pattern from `@/lib/motion_tokens`:

```tsx
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: "-40px" }}
  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
>
  {items.map(item => <motion.div key={item.id} variants={fadeUp}>...</motion.div>)}
</motion.div>
```

- Featured section uses `staggerChildren: 0.12` (slower, dramatic reveal)
- Directory grid uses `staggerChildren: 0.06` (faster cascade for denser grid)
- Duration-based ease-out (not spring) for entry — compliant with the motion linter which bans inline `stiffness`/`damping`
- CSS transitions for hover effects (`group-hover:scale-105`, `transition-shadow`) rather than `whileHover` — lighter weight and avoids inline spring configs

### 5. Lint-Driven Bug Pattern: Group Classes Lost During Extraction

The most common regression when extracting components for lint compliance: **parent-child CSS relationships break.**

When `store_card.tsx` was extracted into sub-components, the `group` class (required for `group-hover:*` effects) was accidentally dropped from the parent `<Link>` element. This broke image zoom-on-hover and text underline-on-hover.

**Fix applied:** Always verify that `group`, `relative`, and other coordinating classes survive the extraction. The motion.wrapper div (`motion.div variants={fadeUp}`) is the actual parent in the DOM tree — adding `block` to the Link prevents border peeking above the wrapper due to the `<a>` tag's default `display: inline`.

## Why This Matters

- **Design token migration eliminates `dark:` noise** — The old code had twice the class count from separate light/dark pairs. The `mc-*` token system auto-switches themes, reducing class boilerplate and the risk of forgetting a `dark:` variant.
- **Strict lint rules produce consistent, reviewable code** — The 25-line function limit forces extraction without requiring judgment calls about "when is a component big enough." The extracted components have clear, single responsibilities. The cost is extra files (11 files for the explore directory vs. 5 before) and the risk of CSS relationship bugs during extraction.
- **The gallery-wall pattern works with incomplete data** — The featured card gracefully falls back to an initial-letter placeholder when no avatar URL exists. Text readability is guaranteed by the gradient overlay regardless of image content.

## When to Apply

- When adding a new page or section to the MilkCrate frontend — use `mc-*` tokens from the start rather than converting later
- When a component exceeds 25 lines, extract presentation-layer sub-components (image, text content, wrapper) rather than mixing them inline
- When building image-dominant cards, use absolute-positioned images with gradient overlays so the design works with any image content
- When adding entrance animations, use the `fadeUp` variant pattern from `@/lib/motion_tokens` with `whileInView` — not custom spring configs

## Examples

**Before (old pattern — inline light/dark pairs):**

```tsx
<p className="mt-1 text-sm text-stone-500 dark:text-stone-400">@{store.discogs_username}</p>
```

**After (mc-* token — single class handles both themes):**

```tsx
<p className="mt-1 text-sm text-mc-text-dim">@{store.discogs_username}</p>
```

**Before (monolithic component — 51 lines, 2 components, depth 5):**

```tsx
// All card code in one file, FeaturedSection + FeaturedCard in same file
function FeaturedCard({ store }) { /* 55 lines of JSX */ }
```

**After (extracted — 5 files, max 25 lines, depth 3):**

```
featured_card.tsx          # ~20 lines — motion.wrapper + gradient + composition
featured_card_image.tsx    # ~18 lines — image or fallback
featured_card_content.tsx  # ~25 lines — text overlay with listing count at bottom
```

## Related

- Design tokens: `app/assets/tailwind/application.css`
- Motion tokens: `app/frontend/lib/motion_tokens.ts`
- Motion token linter: `scripts/lint-motion-tokens.ts`
- Design system linter: `scripts/lint-design-system-tokens.ts`
- Plan document: `docs/plans/2026-06-12-002-feat-explore-gallery-wall-design-plan.md`
- Related learning — storefront animation token system: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- Related learning — responsive branching guard condition drift: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
