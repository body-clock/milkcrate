---
title: "feat: Explore page gallery-wall visual redesign"
type: feat
status: completed
date: 2026-06-12
origin: docs/brainstorms/2026-06-12-explore-page-redesign-requirements.md
---

# Explore Page Gallery-Wall Visual Redesign

## Summary

Refine the explore page visual design from generic Tailwind stone-* classes into a gallery-wall aesthetic anchored in the MilkCrate design system. Featured stores get hero treatment with image-dominant cards and text overlays. Directory grid cards become image-forward with shadow elevation instead of borders. The page gains motion via staggered entrance animations and hover effects using existing Framer Motion tokens.

---

## Problem Frame

The explore page implementation is complete (filtering, featured stores, richer cards) but uses generic Tailwind `stone-*` classes that are disconnected from the MilkCrate design system (`mc-*` tokens, Spectral serif, oxblood/charcoal palette). The page feels like a contact list, not a gallery. Cards have flat borders instead of depth, the header is a bare `<h1>`, and there's no motion — missing the warm, curatorial feel of a record shop wall display.

---

## Requirements

- R1. All explore components use `mc-*` design tokens instead of `stone-*` Tailwind classes
- R2. Featured section cards are image-dominant with text overlay (dark gradient over image, taller aspect ratio)
- R3. Directory grid cards use shadow/elevation instead of borders for gallery-wall feel
- R4. Header section includes intro copy beneath the h1, styled as a hero section
- R5. Page uses staggered entrance animations via existing Framer Motion tokens
- R6. Cards use hover effects (scale + lift) from existing motion tokens
- R7. Design works correctly in both light and dark themes via mc-* token switching

---

## Scope Boundaries

- Search/filter functionality (deferred in original requirements)
- Inventory-derived genre tags (deferred in original requirements)
- Changes to MarketingLayout or site-wide design tokens
- New component files — work is refinements to existing components only

### Deferred to Follow-Up Work

- Genre filter bar or search input on the explore page
- Inventory-derived genre tags from enrichment analysis
- Store count badge or "new" indicators on cards

---

## Context & Research

### Relevant Code and Patterns

- `app/assets/tailwind/application.css` — mc-* design tokens, motion tokens, section-header pattern
- `app/frontend/lib/motion_tokens.ts` — Framer Motion spring configs, scale/lift/easing presets
- `app/frontend/components/home/hero_section.tsx` — hero section pattern to follow for header
- `app/frontend/components/home/character_section.tsx` — motion entrance pattern (fadeUp, whileInView)
- `app/frontend/components/record_card/motion_props.ts` — shadow/lift pattern for cards
- `app/frontend/layouts/marketing_layout_content.tsx` — page shell with max-w-6xl content width

### Institutional Learnings

- Spectral serif (`font-mc`) is the app typeface — all headings should use it
- mc-* tokens auto-switch between dark (charcoal/oxblood) and light (parchment/warm brown) themes
- Framer Motion is already installed and used across home page sections
- Section headers use uppercase accent labels with border-bottom dividers (`.mc-section-header` pattern)

---

## Key Technical Decisions

- **Replace stone-* with mc-* everywhere**: The explore page is the only marketing page using generic Tailwind colors. Switching aligns it with home page and storefront patterns.
- **Featured cards use image-as-backdrop**: Instead of image above text, the image fills the card and text overlays with a dark gradient. This is the gallery-wall feel — the image IS the card.
- **Shadow elevation instead of card borders**: Gallery walls don't have visible frames. Use shadow (like record_card's `motionShadow`) for depth, with border-mc-border as a subtle fallback.
- **Staggered entrance via motion.div**: Wrap the grid in a `motion.div` container with staggered children using existing `springTactile` and `EASE_OUT` tokens. Follow the character_section.tsx pattern.

---

## Open Questions

### Resolved During Planning

- Should we add a new component file? No — refine existing components only.
- Should we change the MarketingLayout? No — it provides the shell; keep as-is.

### Deferred to Implementation

- Exact gradient opacity/values for featured card text overlay — tune visually
- Exact shadow values for directory cards — match record_card pattern or adjust for gallery feel

---

## Implementation Units

### U1. Convert explore page to mc-* design tokens

**Goal:** Replace all `stone-*` Tailwind classes with `mc-*` design tokens across explore components, ensuring light/dark theme support.

**Requirements:** R1, R7

**Dependencies:** None

**Files:**
- Modify: `app/frontend/pages/explore.tsx`
- Modify: `app/frontend/components/explore_directory/directory_body.tsx`
- Modify: `app/frontend/components/explore_directory/empty_state.tsx`
- Modify: `app/frontend/components/explore_directory/error_alert.tsx`
- Modify: `app/frontend/pages/explore/header_section.tsx`

**Approach:**
- Replace `stone-200/400/700` borders with `mc-border`
- Replace `stone-100/800` backgrounds with `mc-bg-raised` or `mc-bg-card`
- Replace `stone-500/600/300/400` text with `mc-text` and `mc-text-dim`
- Replace `font-medium`/`font-semibold` headings with `font-mc` where appropriate
- Verify error_alert uses existing mc-feedback-danger tokens (already does — just confirm)

**Patterns to follow:**
- `app/frontend/components/home/character_section.tsx` — mc-* token usage
- `app/assets/tailwind/application.css` — mc-* token naming convention

**Test scenarios:**
- Test expectation: none — pure styling refactor with no behavioral change

**Verification:**
- All explore components render correctly in dark mode (default)
- All explore components render correctly in light mode (`data-theme="light"`)
- No `stone-*` classes remain in any explore component

---

### U2. Redesign header section as hero

**Goal:** Transform the bare `<h1>` header into a hero section with intro copy, matching the home page's character and energy.

**Requirements:** R4

**Dependencies:** U1 (mc-* tokens in place)

**Files:**
- Modify: `app/frontend/pages/explore/header_section.tsx`

**Approach:**
- Add intro copy beneath h1: "Discover independent record stores powered by MilkCrate" (or similar)
- Use `text-mc-text-dim` for the subhead, `font-mc` for the heading
- Add padding and breathing room (py-10 sm:py-16 to match home hero sections)
- Consider centering the text (like hero_section.tsx pattern)

**Patterns to follow:**
- `app/frontend/components/home/hero_section.tsx` — hero layout pattern
- `app/frontend/components/home/hero_text.tsx` — typography hierarchy

**Test scenarios:**
- Test expectation: none — visual-only component with no behavioral logic

**Verification:**
- Header has visible intro copy beneath the h1
- Spacing matches home page hero sections
- Text uses mc-* tokens and renders in both themes

---

### U3. Redesign featured section with image-dominant cards

**Goal:** Transform featured cards into gallery-wall hero pieces — image fills the card, text overlays with gradient, taller aspect ratio, curatorial presence.

**Requirements:** R2, R6

**Dependencies:** U1 (mc-* tokens in place)

**Files:**
- Modify: `app/frontend/components/explore_directory/featured_section.tsx`

**Approach:**
- Featured card image fills the entire card (absolute positioning, object-cover)
- Text overlays the image with a dark gradient from bottom (`bg-gradient-to-t from-black/70 to-transparent`)
- Taller aspect ratio: `aspect-[3/4]` or `aspect-[4/5]` for featured cards (vs current `aspect-[4/3]`)
- Text is white/light over the gradient overlay
- Card has no visible border, shadow elevation instead
- Genre tags styled as pills over the image
- Hover: scale up image slightly, lift card (use `SCALE_HOVER` and `LIFT_HOVER` from motion_tokens)
- Remove the `rounded-lg` border in favor of `rounded-lg` shadow container

**Technical design:**
> *Directional guidance, not implementation specification.*

```
FeaturedCard structure:
  Link (relative, overflow-hidden, rounded-lg, shadow, group)
    div (aspect-[4/5], relative)
      img (absolute inset-0, object-cover, group-hover:scale-105 transition)
      div (absolute inset-0, bg-gradient-to-t from-black/70 via-black/20 to-transparent)
      div (absolute bottom-0, p-5, text-white)
        h3 (text-xl font-bold font-mc)
        p (text-sm text-white/80, @username)
        p (text-sm, location)
        div (flex flex-wrap gap-1, genre tags as white/20 pills)
        p (text-sm text-white/70, description, line-clamp-2)
        p (text-sm, listing count)
```

**Patterns to follow:**
- `app/frontend/components/record_card/motion_props.ts` — shadow pattern for elevated cards

**Test scenarios:**
- Test expectation: none — visual redesign with no new behavioral logic

**Verification:**
- Featured cards display image as the dominant element
- Text is readable over the image gradient
- Cards have no visible border, only shadow elevation
- Hover effect shows scale and lift
- Three featured cards display in a responsive grid (1 col mobile, 2 tablet, 3 desktop)

---

### U4. Add motion: staggered entrance and card hover effects

**Goal:** Add page-level entrance animations and card hover effects using existing Framer Motion tokens.

**Requirements:** R5, R6

**Dependencies:** U1, U3 (tokens converted, cards redesigned)

**Files:**
- Modify: `app/frontend/components/explore_directory/featured_section.tsx`
- Modify: `app/frontend/components/explore_directory/directory_body.tsx`
- Modify: `app/frontend/pages/explore.tsx`

**Approach:**
- Wrap featured section grid in `motion.div` with staggered children (stagger: 0.1)
- Wrap directory grid in `motion.div` with staggered children
- Each card is a `motion.div` with fadeUp variant (opacity 0→1, y 12→0)
- Use `whileInView` with `viewport={{ once: true }}` for scroll-triggered entrance
- Use existing `springTactile` and `EASE_OUT` from `@/lib/motion_tokens`
- Directory cards: hover uses `whileHover` with y: -LIFT_HOVER and scale: SCALE_HOVER
- Reduce motion: respect `prefers-reduced-motion` via existing `reducedMotionTransition`

**Patterns to follow:**
- `app/frontend/components/home/character_section.tsx` — staggered fadeUp entrance pattern
- `app/frontend/lib/motion_tokens.ts` — spring configs, scale/lift constants, reduced motion

**Test scenarios:**
- Test expectation: none — motion enhancements with no behavioral change

**Verification:**
- Cards fade in with stagger when scrolling into view
- Hover on directory cards shows lift effect
- Hover on featured cards shows scale effect
- Animations are smooth and not janky
- Reduced-motion preference disables animations

---

## System-Wide Impact

- **Interaction graph:** No new callbacks, middleware, or entry points. Pure presentational changes.
- **Error propagation:** No change — error_alert already uses mc-feedback-danger tokens.
- **State lifecycle risks:** None — no state changes, no persistence, no caching.
- **API surface parity:** No API changes.
- **Integration coverage:** Visual verification in browser required for both themes.
- **Unchanged invariants:** ExploreController, store_props, featured_stores logic, MarketingLayout — all unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Featured card text unreadable over varied avatar images | Use strong gradient (from-black/70) and test with light/dark images |
| Motion performance on low-end devices | Use `will-change: transform` via compositedLayer, respect prefers-reduced-motion |
| mc-* tokens look wrong in one theme | Verify both themes visually after each unit |

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-06-12-explore-page-redesign-requirements.md`
- Design system: `app/assets/tailwind/application.css`
- Motion tokens: `app/frontend/lib/motion_tokens.ts`
- Related plan: `docs/plans/2026-06-12-001-feat-explore-page-redesign-plan.md`
