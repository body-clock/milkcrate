---
date: 2026-06-01
topic: store-page-visual-refresh
focus: Distinguishing Wall/Picks, Featured Crates, and Genre Crates using real-world record store concepts
mode: repo-grounded
---

# Ideation: Store Page Visual Refresh

## Design Principle: Mobile-First, Desktop-Outward

Per the storefront experience language doc and mobile hierarchy spec, **compact (≤767px) is the source hierarchy.** Every mode, every label, and every transition must make sense on a phone first. Comfy (768–1023px) and wide (≥1024px) layouts are adaptations that reveal more of the same session — they do not introduce a second product.

The ideas below lead with the compact experience. Desktop descriptions follow as outward adaptation. No idea depends on hover, pointer precision, or screen real estate to communicate its intent — those enrich the same vocabulary on larger surfaces.

**Core mobile constraint:** Today, on a phone, the store floor is three vertically stacked card grids with zero visual distinction. The Wall's hover animation wrapper is stripped. The "DIG →" entry label is permanently invisible (hover-only). A first-time compact shopper sees a uniform scroll of bordered rectangles. All five ideas below start by fixing this specific experience.

## Grounding Context

**Codebase:** Rails/Inertia/React record store browser. Store page (`StoreFloor`) renders 3 sections: `picks_wall` (single crate), `featured_crates` (row of crates), `genre_grid` (grid of genre crates). ALL three currently use the same visual primitive — `CrateShelf` inside `CrateCard` — bordered cards with thumbnail grids and identical hover animations. The experience language doc (`docs/brainstorms/2026-05-31-storefront-experience-language-requirements.md`) names these Wall, Featured, Genre as distinct session modes, but today they're visually near-identical.

**Key gap:** "A first-time shopper cannot tell which section is the Wall vs. a crate menu." The Wall (Mode 2 in the mobile hierarchy) should signal the store's taste at a glance. Featured crates and genre crates (Mode 3) should feel like choosing which crate to enter.

**Semantic hierarchy:** Picks = editorial/taste-signaling (marquee treatment), Featured = staff-selected (badge/accent), Genre = categorized-browsing (systematic/grid).

**Architecture constraint:** Build on `CrateShelf`/`CrateCard` primitives with differentiated props, layout variants, or section-specific wrappers — not parallel visual systems. Three viewport tiers (compact ≤767px, comfy 768–1023px, wide ≥1024px). Use the shared animation token system (`motion_tokens.ts`) for any motion.

**Past learnings cited:** Vendor brand surface system, crate strategies pattern, viewport-context responsive architecture, animation token system.

**External research:** Unavailable (no web fetch tool in environment).

## Topic Axes

1. **Section identity & signage** — How each section announces itself (labels, headers, copy)
2. **Layout & spatial differentiation** — How sections occupy space differently (size, density, arrangement)
3. **Interaction & affordance** — How the shopper engages with each section (hover, entry, feedback)
4. **Visual treatment & mood** — How sections feel (color, typography, imagery, motion)
5. **Progressive disclosure** — How sections reveal depth (glance vs. enter, temporal signals)

## Ranked Ideas

### 1. Wall as Editorial Marquee

**Description:** *Mobile-first:* On a phone, the Wall is the first surface after the store header. Instead of being a bordered card identical to every crate below it, the Wall renders as an open, borderless surface. A single prominent record cover spans most of the viewport width with the crate name set in confident, scaled typography and a small "Today" date marker. Below the lead cover, 4 supporting thumbnails sit in a borderless grid — like albums spread on a counter. A visible "DIG →" entry label sits below the grid (always visible — no hover dependency). The Wall is the only unbordered surface on the store floor, creating an immediate spatial threshold.

*Desktop outward:* At comfy and wide, the lead cover and supporting grid expand into a full-width editorial band. The hero record and thumbnails can sit side-by-side with generous negative space. Hover enriches the experience with immersive editorial motion (deeper lift, slower spring). The "Fresh Today" marker gains a subtle one-shot reveal animation on first load of the day, dissolved via `sessionStorage`.

**Axis:** Layout & spatial differentiation + Visual treatment & mood

**Basis:** `direct:` `PicksShelf` already strips the border at non-compact (`border-0 rounded-none` — `store_floor.tsx:42`) but leaves it on compact — the exact opposite of what mobile-first demands. The borderless treatment should originate on compact and persist upward. `CrateShelf` always renders with `border border-mc-border rounded-lg`. The Wall's `meta` prop already carries today's date. `direct:` Experience language doc: "Wall: The Milkcrate Picks surface, a quick read on the store's taste." A "quick read" on a phone means one commanding image, not a grid of 4 equal squares. `external:` Bandcamp's mobile daily feature and Apple Music's editorial cards use lead-image + supporting-grid compositions that work at phone scale.

**Rationale:** The Wall is the product's primary taste signal. On a phone, rendering it as a bordered card in a stack of bordered cards communicates "one more thing to scroll past." Removing the border and scaling up one cover makes the Wall feel like a moment — the store's voice — before the shopper enters the crate-navigation zone below. The open surface creates a clear threshold: editorial zone above, card-based navigation below.

**Downsides:** The lead cover + grid increases vertical height on compact (more scroll before Featured reaches the viewport). A Wall-specific layout variant in `CrateShelf` or a lightweight `WallMarquee` wrapper is needed. The lead record choice (which of 50 picks gets the hero spot) is a curation decision — defaults to first record from `RecordScorer` ranking.

**Confidence:** 85%

**Complexity:** Medium

**Status:** Explored

---

### 2. Differentiated Section Layout System

**Description:** *Mobile-first:* On a phone, three vertically stacked card grids (Wall → Featured → Genre) produce a monotonous scroll with no spatial rhythm. Each section should have a distinct scroll footprint. Wall = open, borderless editorial surface (see #1). Featured = a compact single-column stack, but the crate cards have a different aspect ratio — wider and shorter (landscape), with the crate name beside the thumbnails rather than stacked above — creating a visual pace change from the Wall's verticality. Genre = a tight 2-column grid with minimal gap, optimized for fast category scanning. Section spacing follows a deliberate rhythm: Wall bottom margin is generous (signals "this was a moment"), Featured moderate, Genre tightest (signals "dive in").

*Desktop outward:* At comfy and wide, Featured crates expand to a horizontal scrollable row with snap points — the shopper scrolls *across* through staff picks rather than *down*. Genre gains columns (3 comfy, 4 wide). The spacing rhythm amplifies: the Wall's breathing room becomes more pronounced, the Featured-to-Genre transition tightens. The layout differences are encoded as declarative `ResponsiveMap<T>` configs on a unified `CrateSectionGrid` primitive, collapsing the near-identical `FeaturedCratesRow` and `GenreGrid` wrappers.

**Axis:** Layout & spatial differentiation

**Basis:** `direct:` On compact, `FeaturedCratesRow` uses `columnCount: 1` — a single vertical column indistinguishable from the Wall's card and the Genre grid's 2 columns. `GenreGrid` uses `gap-3` vs Featured's `gap-4` — a 4px difference invisible to users. The uniform `gap-8` on `StoreFloor` applies to all sections. `direct:` `FeaturedCratesRow` (8 lines) and `GenreGrid` (6 lines) are passthrough wrappers — collapsing them into a layout-driven unified primitive reduces code and centralizes responsive decisions. `external:` Spotify and Apple Music mobile apps use horizontal scroll rows for curated collections and vertical grids for browse-all — users recognize the scroll-axis shift as a section boundary.

**Rationale:** The mobile hierarchy spec defines Wall (Mode 2) and Crate Entry (Mode 3) as distinct session modes. Three vertical stacks blur that distinction — the shopper's thumb does the same motion for every section. A different card shape at Featured (landscape) creates a visual pace change; tighter Genre spacing creates a "you are now in the catalog zone" signal. Both work without hover, without labels, and without new components — just layout differentiation.

**Downsides:** Landscape Featured cards on compact require a layout variant in `CrateShelf` (currently always `flex-col`). Horizontal scroll on desktop with 2-3 crates may feel sparse; needs `justify-center` fallback. The `ResponsiveMap<T>` abstraction is engineering overhead if not adopted consistently across the storefront.

**Confidence:** 75%

**Complexity:** Low-Medium

**Status:** Unexplored

---

### 3. Section Identity & Signage Grammar

**Description:** *Mobile-first:* On a phone, section labels must work at small scale. A `<SectionSign>` primitive takes `type: "wall" | "featured" | "genre"` and renders a compact identity treatment. Wall carries a 2px warm accent top-edge line — visible even when the Wall content has scrolled partially off-screen — plus the crate name as a section heading. Featured crate cards carry a subtle amber/gold badge or ribbon (e.g., a small filled-star icon beside the crate name) — visible at rest, no hover required. Genre crates use thin 2px left-edge color accents derived from a genre-to-color mapping (navy for Jazz, purple for Electronic, amber for Hip-Hop, etc.) — the mobile equivalent of the physical genre divider tabs in a record store bin. The accent is systematic and low-opacity — it colors the card's left border, visible when scanning.

*Desktop outward:* At comfy and wide, the Wall's accent rule gains more presence. Featured badges have room for a short text label ("Staff Pick") in addition to the icon. Genre color accents become more saturated and the genre-name heading can optionally render in the accent color. The `<SectionSign>` primitive handles all ARIA labeling, heading levels, and region roles — a single point of accessibility enforcement.

**Axis:** Section identity & signage + Visual treatment & mood

**Basis:** `direct:` `CrateCard` receives a `variant` prop (`"featured" | "genre"`) but only uses it for `headerSize` (text-base vs text-sm) — a typographic detail invisible at phone scale. The variant pipeline carries zero visual payload. `CrateSectionGrid` renders section-level chrome (`border-b`, `description`) that is visually identical across sections — same `border-mc-border` divider on every section. `direct:` Audit finding: "A first-time shopper cannot tell which section is the Wall vs. a crate menu." `external:` Physical record stores use genre divider cards — thick cardstock tabs with hand-lettered genres — ubiquitous in every independent record store worldwide. Shoppers navigate bins by tab color before reading text. Mobile apps like Spotify use color-coded genre tiles.

**Rationale:** Color and iconography are pre-attentive — a shopper scrolling at speed on a phone can locate "the oxblood section" (Wall) or find "Jazz" by the navy left-edge accent before reading a single label. Badges on Featured cards communicate "this one is different" without requiring the shopper to parse the section heading. The SectionSign primitive is a single point to enforce accessibility across all sections — today `StoreFloor` and `CrateSectionGrid` manage ARIA independently with different patterns.

**Downsides:** Genre-to-color mapping needs a maintainable palette — 4-6 colors covers typical crate counts, but more genres could exhaust distinct colors at low opacity. The badge must map to a real semantic distinction (staff-selected = true) to avoid feeling decorative. Color must not be the only differentiator (accessibility: pair with icon/shape).

**Confidence:** 70%

**Complexity:** Low

**Status:** Unexplored

---

### 4. Interaction Rhythms by Section Role

**Description:** *Mobile-first:* On a phone, there is no hover. Today, the "DIG →" entry label is permanently invisible on touch screens (`opacity: isHovered ? 1 : 0`), and crate cards offer no visual cue that they're tappable. This idea fixes the compact contract first: every crate card gets a persistent, always-visible entry affordance — a small "Enter →" label below the thumbnail grid or a right-edge chevron on the card header. The Wall gets the only "DIG →" label (editorial copy reserved for the taste-signaling surface). Genre cards are deliberately still on tap — a simple CSS opacity transition on press, no lift, no tilt. Stillness is the Genre interaction signal: "this is the catalog — scan, pick, move on." Featured cards get a subtle press-scale (0.98) — enough to confirm the tap without distracting from the browsing rhythm.

*Desktop outward:* At comfy and wide, hover enriches the contracts established on compact. Wall gains immersive editorial motion — a slower, deeper lift with a subtle sample cue on load. Featured cards get the standard tactile hover (lift, tilt, border glow) with a badge pulse. Genre cards remain still on hover — just a border-color transition. The motion hierarchy is: Wall = stop and look, Featured = these are highlighted, Genre = scan and move.

**Axis:** Interaction & affordance

**Basis:** `direct:` `CrateShelf`'s `openLabel` animates in with `opacity: isHovered ? 1 : 0` (`crate_shelf.tsx:95-99`) — permanently invisible on touch screens. Audit P1 gap: "a compact shopper must tap the shelf area without any affordance." `direct:` `CrateCard` applies identical `springTactile` / `springPress` animation to all variants via `useTactileHover()` — no differentiation. `external:` Nielsen Norman Group: identical interactions signal identical functions. If sections have different semantic jobs, identical interaction responses train the shopper to ignore those differences.

**Rationale:** On a phone, interaction IS teaching. A persistent "Enter →" label says "you can go deeper here" — the current hidden hover label says nothing. Reserving "DIG →" for the Wall makes it an editorial beacon, not boilerplate. Stillness on Genre cards is the most information-dense signal: when the shopper encounters a section that doesn't animate, they learn "this is different — this is for scanning, not considering." The interaction rhythm (immersion → invitation → stillness) mirrors the semantic hierarchy (editorial → curated → systematic) without requiring a single label.

**Downsides:** A persistent entry affordance on every card adds visual weight — needs to be subtle enough not to compete with cover art. Still Genre on desktop may feel like a bug on first hover. Three motion profiles need maintenance in `motion_tokens.ts`.

**Confidence:** 80%

**Complexity:** Low

**Status:** Unexplored

---

### 5. Progressive Disclosure & Density

**Description:** *Mobile-first:* On a phone, a first-time shopper sees three stacked sections with no guidance on where to start. A one-time subtle orientation cue — a soft animated attention line or gentle glow on the Wall section — fires once per browser via `localStorage`. It says "start here" through visual emphasis alone: no tooltip, no popup, no text. The cue dissolves on any interaction (tap, scroll) or after a 3-second dwell, and never returns. Pattern reuses the existing `GhostFingerCue` from `CrateView`. Thumbnail density also carries semantic weight on compact: Wall shows 4 covers (editorial abundance — "look at all this taste"), Featured crates show 3 (curated highlights — "open to see more"), Genre crates show 2 per card (category labels — "recognize the genre and enter"). The varying thumbnail counts act as a pacing rhythm as the shopper's thumb scrolls.

*Desktop outward:* At comfy and wide, the wayfinding cue has more spatial room — the glow or attention line can be more pronounced. Thumbnail density contrast amplifies: Wall 8, Featured 4, Genre 4. The density rhythm (abundant → moderate → systematic) becomes a learnable signal across visits.

**Axis:** Progressive disclosure

**Basis:** `direct:` `CrateCard` hardcodes `previewCount={4}` for all Featured and Genre crates — zero semantic differentiation. `StoreFloor` computes a dynamic `picksPreviewCount` (4/8) for the Wall only — evidence that density matters but is applied inconsistently. `direct:` `GhostFingerCue.tsx` already implements the one-shot dissolve-on-interaction pattern in the codebase — proven, tested, reusable. `external:` Museum orientation galleries, Apple Store product table placement, and Spotify's first-run "Made for You" promotion all use spatial cues on first visit to teach layout without permanent labels.

**Rationale:** The first-visit wayfinding cue directly addresses the audit's core gap on compact: a first-time shopper doesn't know where to look. It teaches the store's spatial grammar once, then dissolves — the grammar persists through the layout, signage, and interaction treatments from ideas #1–4. Density variation makes the information hierarchy visible without additional chrome or labels. A shopper scrolling at speed perceives "4 covers = stop here" vs. "2 covers = scan and pick" before reading any text.

**Downsides:** The wayfinding cue could feel gimmicky if animated heavily — should be a subtle gradient glow or short attention line, not a bouncing arrow. The `localStorage` flag needs a dismissal path (shopper must be able to ignore it by scrolling). Density differences at compact (2 vs. 3 vs. 4 thumbnails) are subtle — needs companion treatments from ideas #2–4 to register fully.

**Confidence:** 70%

**Complexity:** Low

**Status:** Unexplored

---

## Axis Coverage

| Axis | Primary survivors |
|---|---|
| Layout & spatial differentiation | #1 Wall Marquee, #2 Differentiated Layouts |
| Section identity & signage | #3 Signage Grammar |
| Interaction & affordance | #4 Interaction Rhythms |
| Visual treatment & mood | #1 Wall Marquee, #3 Signage Grammar |
| Progressive disclosure | #5 Disclosure & Density |

## Rejection Summary

39 of 44 raw ideas cut. Key categories:

| Category | Count | Examples |
|---|---|---|
| Merged into a survivor | 24 | Wall-as-Marque → #1; Staff Picks Shelf → #2; Genre Divider Color → #3; Still Genre → #4; Wayfinding → #5 |
| Too radical / fights product model | 5 | Window Display (single viewport breaks mobile hierarchy), Shuffle the Floor, Dig Up (bottom-up order), Silent Store (not shippable), Accent Monopoly (greyscale harms browsing) |
| Too speculative / high complexity | 4 | Genre as Constellation (force-directed layout), Bleed Zones (z-index/a11y), Featured as Drawer (hides staff curation), Wall as Persistent Context (sticky band) |
| Covered by existing patterns | 3 | Silent Sections, Density as Rhythm, Unsign the Wall |
| Below ambition floor / thin basis | 3 | Shuffle the Floor, Genre Abundance, Listening Station standalone |
