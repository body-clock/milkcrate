---
name: Milkcrate
description: A record store at golden hour. Curated vinyl browsing with warmth and taste.
colors:
  oxblood-wax: "#c84830"
  oxblood-deep: "#8a3020"
  warm-ash: "#15120e"
  warm-ash-raised: "#1e1a15"
  warm-ash-card: "#26211b"
  cream-text: "#e6ddd0"
  dust-text: "#807060"
  bark-border: "#352a20"
  notice-surface: "#352020"
  cream-bg-light: "#f5f0e8"
  cream-card-light: "#e0d8c8"
  ink-text-light: "#1a1410"
  amber-accent-light: "#b07030"
  linen-border-light: "#c8bca8"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "0.15em"
    textTransform: "uppercase"
  section:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.2em"
    textTransform: "uppercase"
  body:
    fontFamily: "Georgia, ui-serif, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.65rem"
    fontWeight: 400
    letterSpacing: "0.1em"
    textTransform: "uppercase"
rounded:
  sharp: "2px"
  gentle: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section-gap: "48px"
components:
  button-primary:
    backgroundColor: "{colors.oxblood-wax}"
    textColor: "{colors.warm-ash}"
    rounded: "{rounded.gentle}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.oxblood-wax}"
    textColor: "{colors.warm-ash}"
    rounded: "{rounded.gentle}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dust-text}"
    rounded: "{rounded.sharp}"
    padding: "4px 8px"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.oxblood-wax}"
    rounded: "{rounded.sharp}"
  input:
    backgroundColor: "{colors.warm-ash-raised}"
    textColor: "{colors.cream-text}"
    rounded: "{rounded.sharp}"
    padding: "10px 12px"
  input-focus:
    backgroundColor: "{colors.warm-ash-raised}"
    textColor: "{colors.cream-text}"
    rounded: "{rounded.sharp}"
  crate-card:
    backgroundColor: "{colors.warm-ash-card}"
    textColor: "{colors.cream-text}"
    rounded: "{rounded.gentle}"
    padding: "12px"
  record-card:
    backgroundColor: "{colors.warm-ash-card}"
    textColor: "{colors.cream-text}"
    rounded: "{rounded.sharp}"
  section-header:
    backgroundColor: "transparent"
    textColor: "{colors.oxblood-wax}"
typography: "{typography.section}"
---

# Design System: Milkcrate

## 1. Overview

**Creative North Star: "The Record Store at Golden Hour"**

Milkcrate's interface feels like walking into a record shop in late afternoon. Low warm light, rich wood tones, the quiet anticipation of flipping through crates. The design is warm, tactile, and deliberate. Every surface has weight. Nothing floats; nothing dissolves. The interface serves the records, not itself.

The default theme is dark — deep charcoal backgrounds, oxblood accents, cream text — evoking a dimly lit shop interior. A light theme exists for accessibility and preference, switching to warm kraft-paper tones with an amber accent. Both themes share the same typographic voice: serif body type (Georgia) for extended reading and sans-serif for navigation and labels.

This system explicitly rejects: Discogs-style data density, SaaS-generic blue-and-white palettes, Inter font, glassmorphism, hero-metric templates, and identical card grids. If it looks like a search results page or a dashboard, it's wrong.

**Key Characteristics:**
- Dark first, light as an equal alternative
- Warm, earthy palette — never clinical
- Serif body, sans-serif UI — the pairing carries the tactile feel
- Tonal layering over shadow — depth comes from color, not drop shadows
- Spring-based motion, reduced-motion first
- Every interaction lands with weight

## 2. Colors

The palette splits across two themes. Dark mode (default) uses deep charcoals and oxblood red. Light mode uses warm kraft-paper tones and amber. Both share the same neutral family — warm browns — tinted away from pure black or white.

### Primary

- **Oxblood Wax** (#c84830): The accent. Used on primary buttons, section headers, active links, pile count badges. Appears on ≤15% of any given screen. In dark mode only.
- **Amber Gold** (#b07030): The light-theme accent. Warmer, more golden. Used in the same roles as Oxblood Wax when the theme is light.

### Neutral (Dark)

- **Warm Ash** (#15120e): Page background. A deep charcoal tinted warm — never true black.
- **Warm Ash Raised** (#1e1a15): Header, sticky bars, section backgrounds. One tonal step above the page.
- **Warm Ash Card** (#26211b): Cards, record faces, interactive surfaces. Two steps above the page.
- **Cream Text** (#e6ddd0): Primary text on dark backgrounds. A warm off-white.
- **Dust Text** (#807060): Secondary text, metadata, hints, placeholder copy.
- **Bark Border** (#352a20): Borders, dividers, line separators.
- **Notice Surface** (#352020): Flash notices, alert backgrounds.

### Neutral (Light)

- **Cream** (#f5f0e8): Page background. Warm off-white, never pure white.
- **Cream Card** (#e0d8c8): Cards and raised surfaces.
- **Ink** (#1a1410): Primary text on light backgrounds. Near-black with brown warmth.
- **Dust (Light)** (#6b5a44): Secondary text on light backgrounds.
- **Linen** (#c8bca8): Borders and dividers on light backgrounds.

### Named Rules

**The Golden Hour Rule.** Every neutral is tinted toward warm brown (chroma ~0.005 in OKLCH). Pure black, pure white, and cool grays are forbidden.

**The One Accent Rule.** A single accent color carries all calls-to-action, section headers, and interactive emphasis. It is never decorative. It is never used as a background fill larger than a button. If the accent appears on more than 15% of the viewport, something is wrong.

## 3. Typography

**Display Font:** ui-sans-serif (system sans-serif stack)
**Body Font:** Georgia, ui-serif, serif
**Label/Mono Font:** ui-sans-serif (same stack as display)

**Character:** A serif body paired with sans-serif navigation — the serif carries the warmth and texture of a record store; the sans-serif provides clarity for UI elements. The pairing is warm and grounded, never precious or literary.

### Hierarchy

- **Display** (700, 1.25rem, tracking-widest, uppercase): The Milkcrate wordmark and store name in the header. Used exactly once per page.
- **Section** (700, 0.7rem, letter-spacing 0.2em, uppercase): Crate names, section titles. Rendered in the accent color. Always paired with a count or date in Dust.
- **Body** (400, 0.875rem, line-height 1.6): All extended reading, descriptions, form labels. Capped at 65ch maximum line length.
- **Label** (400, 0.65rem, letter-spacing 0.1em, uppercase): Form field labels, navigation links, metadata chips, footer text.

### Named Rules

**The Scale Jump Rule.** Adjacent typographic steps differ by at least 1.25× in size. No flat scales. If section headers and body text feel the same weight, the scale is wrong.

**The Serif Body Rule.** All prose, descriptions, and extended text use the serif stack. Sans-serif is reserved for navigation, labels, and interactive text. Never swap them.

## 4. Elevation

Milkcrate uses tonal layering, not drop shadows, as its primary depth mechanism. Three background tones — Warm Ash, Warm Ash Raised, Warm Ash Card — create a stepped foreground effect without shadow blur. The header sits on Warm Ash Raised. Cards sit on Warm Ash Card. The page background is deepest Warm Ash.

Shadows are reserved for a single case: the framed record card in crate view, which carries a large, soft shadow (`0 25px 50px -12px rgb(0 0 0 / 0.35)`) to give the card-stack physical presence. All other surfaces are flat at rest.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Tonal contrast conveys depth. Drop shadows appear only on the crate-view record card, and even then only in the framed variant.

**The Three-Step Ceiling.** No surface exceeds three tonal steps from the page background. If you need a fourth layer, flatten the hierarchy instead.

## 5. Components

### Buttons
- **Shape:** Rounded corners at gentle radius (8px) for primary; sharp (2px) for ghost and inline.
- **Primary:** Oxblood Wax background, Warm Ash text, 12px vertical × 24px horizontal padding, semibold sans-serif at 0.875rem uppercase tracking-wide. Hover reduces opacity to 0.9 with a 150ms transition.
- **Ghost:** Transparent background, Dust text, 4px × 8px padding, 0.65rem sans-serif. Hover shifts text to Oxblood Wax and border to Oxblood Wax in 150ms. Used for secondary actions, pile removal, Discogs links.
- **Disabled:** 50% opacity on primary, not-allowed cursor. Never hide a disabled button — show it dimmed so the affordance is visible.

### Cards
- **Crate Card:** Warm Ash Card background, 8px radius, 1px Bark Border at rest. On hover: border shifts to Oxblood Wax, card lifts 3px, scales to 1.05×, rotates -0.5°. Spring transition (stiffness 300, damping 26). Interior shows 4-cover thumbnail grid plus crate name header.
- **Record Card:** Square aspect ratio, 2px radius, Warm Ash Card background. Interactive card-flip on click/tap (spring, stiffness 260, damping 24). Front shows cover art; back shows title, artist, metadata, genre chips, Discogs link, +Pile button. Crate-view variant adds framed shadow.
- **Section Header:** Transparent background, bottom border (1px Bark Border), Oxblood Wax section name (uppercase, 0.7rem, 700 weight), Dust dim text (0.65rem) for counts and dates. Always paired: name + context.

### Inputs
- **Style:** Warm Ash Raised background, 1px Bark Border, 2px radius, 10px vertical × 12px horizontal padding. Text in Cream (dark) or Ink (light). Placeholder in Dust. Serif body font at 0.9rem.
- **Focus:** Border shifts to Oxblood Wax. No outline, no ring, no glow. The border pulse is the only feedback.
- **Select:** Same styling as text input. Dropdown arrow is browser-default.

### Navigation
- **Storefront Header:** Sticky top, Warm Ash Raised background with 95% opacity backdrop-blur. Left: store name in Display style. Right: Discogs link (Dust, 0.75rem), pile count badge (Oxblood Wax, 0.75rem with "in pile" label), theme toggle (circular, full radius, Dust icon). Compact mode (≤767px) condenses labels.
- **Crate Tabs:** Horizontal bar of section-name labels in Dust. Active tab shifts to Oxblood Wax. Transition 150ms. Used in CrateView to switch between picks, featured crates, and genre crates.
- **Marketing Header:** Same structure but with wordmark (🥛 Milkcrate, uppercase tracking-widest) replacing the store name.

### Pile Sheet
- **Drawer:** Slides in from right (desktop, 384px wide) or bottom (compact, rounded-top). Warm Ash background, Bark Border on the leading edge. Spring transition (stiffness 300, damping 32). Backdrop: black at 50% opacity.
- **Content:** Scrollable list of pile items — 48px square cover thumbnail, title + artist, price in semibold. Swipe-to-remove not implemented; explicit × button instead.
- **Footer:** Total price, disabled "Add all to Discogs cart" button. Clear action with confirmation gate.

### Named Rules

**The Tactile Response Rule.** Every interactive element responds to pointer input with spring-based motion (stiffness 300, damping 26). Hover lifts and scales. Press compresses to 0.97×. No element is inert to touch.

## 6. Do's and Don'ts

### Do:
- Do use Oxblood Wax as the single accent — section headers, primary buttons, active states, pile count. Nothing else gets this color.
- Do tint every neutral toward warm brown. Pure black and pure white are banned.
- Do use Georgia / serif for body text and descriptions. Sans-serif is for UI only.
- Do keep cards flat at rest. Let tonal contrast carry the depth.
- Do respect `prefers-reduced-motion`. Spring animations collapse to instant; scales collapse to 1.
- Do use the three background tones (bg, bg-raised, bg-card) rather than stacking shadows or adding overlay divs.
- Do target WCAG 2.1 AA contrast in both themes. Test Oxblood Wax on Warm Ash and Amber Gold on Cream.

### Don't:
- Don't look like Discogs — no data tables, no white backgrounds, no dense metadata grids, no personality-free listings.
- Don't look like SaaS — no Inter font, no hero-metric templates, no blue accent, no glassmorphism, no identical card grids.
- Don't look like a marketplace — no filter-heavy UIs, no search-narrowing form as the primary interaction, no "sort by price" dropdowns.
- Don't use border-left or border-right greater than 1px as a colored accent stripe. Full borders or nothing.
- Don't use gradient text (background-clip: text). A single solid color carries emphasis through weight, size, or the accent.
- Don't wrap cards inside cards. If you need nesting, flatten the hierarchy instead.
- Don't use modals as your first answer. Exhaust inline expansion, sheet drawers, and progressive disclosure before reaching for a dialog.
- Don't use bounce or elastic easing curves. Springs only, exponential decay. Motion should land and stay landed.
- Don't use em dashes. Commas, colons, periods, or parentheses only.
