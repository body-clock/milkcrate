---
date: 2026-06-01
issue: 217
topic: storefront-mobile-hierarchy
source: docs/plans/2026-06-01-001-feat-storefront-experience-language-issues-plan.md#u3
depends_on: docs/reviews/2026-06-01-storefront-cohesion-audit.md
---

# Storefront Mobile-First Adaptive Hierarchy Requirements

## Summary

The compact storefront (≤767px) is the source hierarchy for the entire
product. Every mode, every label, and every transition must make sense on a
phone first. Comfy (768–1023px) and wide (≥1024px) layouts are adaptations
that reveal more of the same session — they do not introduce a second product.

This document defines each compact mode's job, primary content, persistent
controls, and next transition, then specifies how each mode expands outward on
larger viewports. It does not require a visual redesign or backend changes.

---

## Context

The cohesion audit (`docs/reviews/2026-06-01-storefront-cohesion-audit.md`)
found that Milkcrate's structural backbone is sound but the hierarchy and copy
do not always name the compact modes clearly enough. The top gap is the store
floor reading as a section menu rather than as a store the shopper is moving
through. This document closes that gap by making the mode sequence explicit and
naming the component that owns each mode.

---

## Viewport Tiers

Three tiers, defined in `app/frontend/contexts/viewport_context.tsx`:

- **Compact:** ≤767px. The source hierarchy. Defines every mode's job.
- **Comfy:** 768–1023px. Reveals more content in the same modes.
- **Wide:** ≥1024px. Adds parallel panels for simultaneous context.

The same vocabulary, state model, and product loop apply at every tier.

---

## Compact Mode Sequence

The shopper moves through seven modes in sequence. Each mode has one primary
job and one primary next action. The sequence is not enforced as rigid steps;
shoppers can skip modes (e.g., a direct crate URL) or revisit modes (e.g.,
returning to the store floor). The sequence names where the shopper is and
what they should do next.

### Mode 1: Store Orientation

**Job:** Orient the shopper to the seller's identity and what browsing surfaces
are available.

**Primary content:**
- Store name in the sticky header (persistent across all modes)
- Store description and listing count, shown only before the shopper enters a
  crate (`app/frontend/pages/stores/show.tsx`)
- The store floor below: Wall, featured crates, and genre crates as distinct
  labeled surfaces

**Persistent controls:**
- Store name link back to this orientation view (header)
- Pile trigger in the header (hidden until shopper intent exists)
- Theme toggle (wide only)

**Next action:** Read the Wall to sample the store's taste, or enter a crate
directly.

**Owning component:** `StoreShow` (page) + `AppLayout` (shell) + `StoreFloor`
(floor content)

**Current gap (from audit P1):** The floor renders Wall, Featured, and Browse
by genre as visual sections with no role copy. A first-time shopper cannot tell
which section is the Wall vs. a crate menu. Section labels need explicit job
copy that matches the product nouns.

---

### Mode 2: Wall

**Job:** Show the store's Milkcrate Picks as a distinct curated surface that
signals the store's taste before the shopper enters any crate.

**Primary content:**
- The `picks_wall` shelf rendered by `StoreFloor` / `PicksShelf`
- Record thumbnails showing today's picks (4 on compact, 8 on wider)
- Crate name and today's date as the shelf header
- An entry affordance (currently `"DIG →"` label, visible on hover for
  non-compact only)

**Persistent controls:**
- Store header with pile trigger (hidden until intent exists)

**Next action:** Enter the Wall crate to browse today's picks, or scroll down
to see featured crates.

**Owning component:** `StoreFloor` → `PicksShelf` → `CrateShelf`

**Current gap (from audit P1, P2):**
- The entry affordance (`"DIG →"`) is hover-only on desktop; it is absent on
  compact. A compact shopper must tap the shelf area without any affordance.
- The shelf header uses an interactive `div[role="button"]` rather than a
  native `button`, which reduces semantic clarity for assistive technology.
- The Wall section has no label or aria copy that calls it out as the Wall or
  Milkcrate Picks surface.

---

### Mode 3: Crate Entry

**Job:** Let the shopper choose which crate to enter from the store floor,
without making the choice feel like a generic menu selection.

**Primary content:**
- `FeaturedCratesRow`: up to 3 featured crates (1 column compact, 2 comfy, 3
  wide) labeled "Featured" today
- `GenreGrid`: genre crates (2 columns compact, 3 comfy, 4 wide) labeled
  "Browse by genre" today
- Each crate shows its name, record count, and a thumbnail preview grid
- Hovering a crate card on non-compact shows a lift-and-rotate spring animation

**Persistent controls:**
- Store header with pile trigger (hidden until intent exists)

**Next action:** Tap a crate to enter active crate browsing.

**Owning component:** `StoreFloor` → `FeaturedCratesRow` / `GenreGrid` →
`CrateSectionGrid` → `CrateCard` / `CrateShelf`

**Current gap (from audit P1, P2):**
- "Featured" and "Browse by genre" are functional but do not communicate that
  these are crate collections the shopper is choosing to enter. A shopper
  scanning the page on compact sees three stacked sections (Wall, Featured,
  Browse) without a clear reading of the session progression.
- Primary shelf entry uses `div[role="button"]` rather than native `button`.

---

### Mode 4: Active Crate Browsing

**Job:** Immerse the shopper in one crate as the center of the product loop.
Flipping through records should feel like flipping through a physical crate.

**Primary content:**
- Crate name and record count in the compact sticky header (via `AppLayout`
  `compactLocation` prop, `app/frontend/layouts/app_layout.tsx`)
- Crate tabs for switching between crates in the same store (rendered by
  `CrateHeader` when `layoutMode="compact"`)
- The card stack: active record card with drag/swipe navigation, hint cards
  behind the active card
- Progress bar and prev/next controls below the stack

**Persistent controls:**
- Back arrow to return to store orientation (compact header `IconBackButton`)
- Pile trigger in the header (visible when intent exists)
- Crate tabs for lateral crate navigation

**Next action:** Flip the active card to inspect the record, or drag to the
next card.

**Owning component:** `CrateView` → `CrateHeader`, `CardStack`,
`CrateProgress`

**Current state:** This mode is the most cohesive of the seven. The card stack
is the primary interaction. Context is preserved in browser history via
`useCrateRouting`. The back button returns to the store floor without a full
navigation.

**Current gap (from audit P1):** There is no system-level signal that
differentiates active crate browsing from the Record inspection mode below. On
compact, both live in the same visual container; inspection is accessed by
flipping the card, which is a discoverable but undisclosed interaction.

---

### Mode 5: Record Inspection

**Job:** Let the shopper evaluate one record and decide whether to add it to
the pile or leave for Discogs directly.

**Primary content (compact):**
- The flipped face of `RecordCard`: title, artist, label/year/condition,
  genre chips, price, "+ Pile" / "In pile" button, "Discogs ↗" link
- The back face is accessed by tapping the active card

**Primary content (comfy/wide):**
- A persistent `RecordDetails` panel beside the card stack that shows and
  animates with each navigation swipe
- Full title, artist, metadata, genre and style pills, price, pile action,
  Discogs link, `ScoreBreakdown` below

**Persistent controls:**
- Same as Mode 4 (crate header, tabs, progress)

**Next action:** Add to pile (local state change, pile trigger appears),
navigate to next card, or tap Discogs link to leave for the listing.

**Owning component:**
- Compact: `RecordCard` back face
- Comfy/wide: `RecordDetails` + `ScoreBreakdown` in `CrateView`

**Current gap (from audit P1):**
- On compact, inspection is not a named or signaled mode. The flip interaction
  is the only way to access pile and Discogs actions, but there is no
  affordance for it. This makes the Record moment feel like a hidden
  sub-state of the crate rather than a distinct decision point.
- Nested interactive elements (buttons inside a flippable `div[role="button"]`)
  create focus and interaction ambiguity for keyboard and screen-reader users.

---

### Mode 6: Pile Review

**Job:** Let the shopper review collected records, see the total, and decide
whether to send them to Discogs.

**Primary content:**
- Record list: cover thumbnail, title, artist, price, remove button
- Total price in the footer
- Discogs connection status and Wantlist handoff action (when connected)
- Connect-to-Discogs prompt (when not connected and handoff is available)

**Access:**
- The pile trigger in the header appears only after at least one record is
  added (`app/frontend/layouts/app_layout.tsx:105`)
- `?open_pile` query param opens the pile on load (for post-Wantlist return)

**Persistent controls:**
- Close button returns focus to the store context (header or wherever the
  shopper was)
- The storefront background is set `inert` while the pile is open

**Next action:** Send to Discogs Wantlist (if connected), connect Discogs (if
not), clear the pile, or close and keep browsing.

**Owning component:** `PileSheet` + `PileFooter` + `PileRecordItem` +
wantlist views

**Current state:** This is the strongest transition in the shopper loop. The
drawer has correct dialog semantics, focus trapping, inert background, safe
area handling, and responsive layout (full-screen compact, side panel wide).

**Current gap (from audit P1):** When a record is added, the feedback loop is
local (button state change + header trigger appears). There is no
system-level signal that the record has entered a persistent layer. The
transition from "I tapped + Pile" to "I understand my pile has this record"
is not explicitly closed.

---

### Mode 7: Discogs Handoff

**Job:** Send the shopper from Milkcrate to Discogs to act on their intent.

**Two handoff paths:**

1. **Pile handoff:** Shopper triggers "Add all to Wantlist" from the pile.
   Copy: "Get these records from {storeName} on Discogs." The pile footer
   shows in-progress, success (with Wantlist link), and error states.
   (`app/frontend/components/pile_sheet/pile_footer.tsx`)

2. **Direct listing link:** Shopper taps "Discogs ↗" on a record card or
   detail panel. Opens the Discogs listing in a new tab.
   (`app/frontend/components/record_card.tsx:67`,
   `app/frontend/components/record_details.tsx:58`)

**Owning component:**
- Pile handoff: `PileFooter` → `WantlistHandoffAction` → `WantlistResultView`
- Direct link: `RecordCard` back face, `RecordDetails`

**Current gap (from audit P2):**
- The pile handoff is well-framed: it names the store, the action, and the
  destination.
- Direct listing links are labeled generically as "Discogs ↗" with no context
  about what the shopper will find or whether this is a shopping or inspection
  action. This weakens the handoff framing outside the pile.

---

## Viewport Adaptation Rules

The compact sequence is the source. Larger viewports reveal more of the same
session; they do not change the session's jobs.

### Compact (≤767px)

- The full sequence above applies.
- One content area: store floor or active crate, not both at once.
- Pile sheet is full-screen (`fixed inset-0 h-dvh`).
- CrateHeader is owned by AppLayout's compact header; the in-crate header
  is hidden to avoid double headers.
- Record inspection lives on the card back face.

### Comfy (768–1023px)

- Store floor shows more content density: 2-column featured crates, 3-column
  genre grid, 8 Wall picks.
- Crate view uses the same card stack, but adds the two-column
  `grid-cols-[420px_1fr]` layout (`md:grid` fires at ≥768px) with a persistent
  `RecordDetails` + `ScoreBreakdown` panel beside the active card.
- Record inspection is a named, persistent panel alongside the card stack —
  the card flip still works but is no longer the only path to record details.
  This is the key hierarchy difference between compact and comfy/wide.
- Pile sheet slides in from the right (384px wide) rather than covering the
  full screen.
- Theme toggle becomes visible.

### Wide (≥1024px)

- Store floor: 3-column featured crates, 4-column genre grid, PicksShelf
  gains hover animation wrapper.
- Crate view continues to use the two-column `grid-cols-[420px_1fr]` layout
  established at comfy. Record inspection is already a persistent side panel
  at this tier.
- Wider card sizes and more breathing room compared to comfy.
- Pile sheet same as comfy (right-side panel).
- CrateHeader always uses `TextBackButton` rather than `IconBackButton`.

---

## Component Ownership Summary

| Mode | Compact component | Comfy/wide additions |
| --- | --- | --- |
| Store orientation | `StoreShow`, `AppLayout`, `StoreFloor` | Increased density, PicksShelf hover wrapper |
| Wall | `PicksShelf` → `CrateShelf` | 8-pick preview, hover lift animation |
| Crate entry | `FeaturedCratesRow`, `GenreGrid` | More columns per tier |
| Active crate browsing | `CrateView`, `CardStack`, `CrateProgress` | Larger card sizes |
| Record inspection | `RecordCard` (back face) | `RecordDetails` + `ScoreBreakdown` panel (comfy and wide) |
| Pile review | `PileSheet` (full-screen) | `PileSheet` (right panel at comfy/wide) |
| Discogs handoff | `RecordCard` link, `PileFooter` wantlist | `RecordDetails` link |

---

## Gaps That Require Follow-Up Issues

The following gaps were identified in the cohesion audit and are confirmed by
this hierarchy review. They are listed in priority order for downstream
implementation work.

### G1: Store-floor section labels need explicit Wall and crate-entry jobs

**Affected modes:** Store orientation (Mode 1), Wall (Mode 2), Crate entry
(Mode 3)

**What to change:** Add role copy and accessible labels so the store floor
communicates Wall, featured crates, and genre crates as distinct jobs in the
session, not as three generic menu sections. Update `store_floor.tsx`,
`featured_crates_row.tsx`, `genre_grid.tsx`, `crate_section_grid.tsx`. Convert
interactive `div[role="button"]` shelf headers to native `button` elements in
`crate_shelf.tsx`. Add responsive tests asserting correct section labels and
order at compact tier.

**Scope boundary:** No backend rename. No visual redesign.

### G2: Compact record inspection needs an explicit affordance

**Affected modes:** Record inspection (Mode 5)

**What to change:** Add a compact inspection surface or affordance that makes
the Record moment visible without depending on the flip interaction alone. Keep
the card stack as the primary immersive experience. Address nested interactive
element structure in `RecordCard`. Add keyboard and screen-reader tests.

**Scope boundary:** No data-model rename. No visual redesign that weakens the
crate browsing experience.

### G3: Add-to-pile needs a system-level confirmation

**Affected modes:** Record inspection (Mode 5) → Pile review (Mode 6)
transition

**What to change:** Add a compact-friendly signal when a record enters the
pile. Test the real path from record action to header pile trigger. Keep the
pile trigger hidden for empty sessions.

**Scope boundary:** No visual redesign. No checkout or reservation claim.

### G4: Direct Discogs links need handoff framing

**Affected modes:** Discogs handoff (Mode 7), Record inspection (Mode 5)

**What to change:** Update direct "Discogs ↗" link copy or aria-label in
`record_card.tsx` and `record_details.tsx` to frame the action as a listing
handoff rather than a generic external link. Remove the stale cart reference
in `docs/design.md`. Add a copy guard test.

**Scope boundary:** No pile or Wantlist changes. No checkout claim.

### G5: Storefront sync failure copy must not leak developer operations

**Affected modes:** Store orientation (Mode 1)

**What to change:** Replace "Try running the sync again from the Rails console"
in `stores/show.tsx` with store-safe copy. Route owner instructions to the
admin surface.

**Scope boundary:** No backend behavior change.

---

## Acceptance Verification

A future implementer reading this document should be able to answer:

1. **What does the store floor do before a shopper enters a crate?** It
   orients the shopper to the seller identity and presents three surfaces in
   sequence: Wall (taste read), featured crates (curated entry), and genre
   grid (open browsing entry).

2. **How does a shopper get to record inspection on compact?** They enter a
   crate from the store floor, then flip the active card in the card stack to
   see title, metadata, actions, and the Discogs link.

3. **When does the pile appear in the header?** Only after at least one record
   has been added to the pile. An empty session does not show a pile trigger.

4. **How do comfy and wide differ from compact?** Comfy and wide (both ≥768px,
   covered by Tailwind `md:`) reveal a persistent `RecordDetails` panel beside
   the active card stack. The session loop is the same; record inspection
   becomes always-visible rather than behind the card flip.

5. **Does this spec require a visual redesign?** No. Gaps G1 through G5 are
   copy, labeling, affordance, and semantic changes. No layout, color, or
   spacing system changes are implied.
