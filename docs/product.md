# Product

## Unified Storefront Experience

Milkcrate is one connected storefront session, not a set of separate page
tools. The shopper moves through a store, reads the wall for taste, enters a
crate, inspects a record, adds intent to the pile, and leaves through a
Discogs handoff when they are ready to act.

Core shopper-facing nouns:

- **Store:** The seller's owned space and browsing context.
- **Wall:** The curated Milkcrate Picks surface that previews the store's
  taste.
- **Crate:** The immersive browsing mode and primary interaction.
- **Record:** The unit of inspection and decision.
- **Pile:** The shopper's persistent intent layer, not a cart and not a
  checkout claim.
- **Handoff:** The transition from Milkcrate intent to Discogs action.

Do not use "register" as a primary shopper-facing noun. Milkcrate does not
provide checkout. Shopper copy can use tactile store language, while Discogs
integration code keeps precise external-system names such as OAuth, Wantlist,
listing, release, and seller.

Mobile-first means the compact sequence defines the product hierarchy. Desktop
and larger layouts adapt that sequence outward by revealing context, previews,
and parallel inspection while preserving the same loop, vocabulary, and state
model.

## Users

Record buyers shopping online — browsing a store's collection to discover records they wouldn't find through Discogs search or wantlists. They want the feel of flipping through crates in a physical shop: spatial, serendipitous, warm.

Store owners are the secondary user — they connect a Discogs API key and get a storefront with zero setup. Premium tier unlocks customization that lets a store's personality come through.

## Product Purpose

Make online record browsing feel like walking into a record store. Translate the personality and depth of a physical shop into a digital space, using a digger's algorithm that surfaces what's interesting rather than what's merely listed.

## Brand Personality

Warm, tactile, earthy. A record store at golden hour. Fun and playful, never data-dense or utilitarian.

Three words: warm, curious, tactile.

## Anti-references

- Discogs — dense data tables, white-background listings, no personality, utility-first
- SaaS-generic — Inter font, hero-metric templates, blue accent, glassmorphism, identical card grids
- Marketplace tools — filter-heavy UIs, search result pages, "sort by price"
- Spreadsheet interfaces — tabular layouts, too much metadata at once

## Design Principles

1. **Browsing, not searching.** Spatial crates, serendipitous discovery. The interface reveals records; it doesn't interrogate the user.
2. **Taste over data.** Curation wins over exhaustive metadata. Show fewer records, better chosen. The algorithm does the digging.
3. **Record store warmth.** Physical, textured, tangible. Dark warm tones, serif type, the feeling of being in a shop at golden hour.
4. **Digger's delight.** Reward exploration. Every interaction should surface something surprising. No dead ends.
5. **Owner's character.** Each storefront feels like the store's own space. Premium tier unlocks customization that lets a store's personality come through. Never a white-label template.
6. **One storefront loop.** Store floor, wall, crate, record, pile, and Discogs handoff should preserve context and shopper intent as one continuous browsing session.

## Frontend Confidence

Evaluate shopper-facing frontend confidence at the system level before
prioritizing isolated component polish. The current gap is cohesion across
hierarchy, copy, motion, affordance, responsive adaptation, and accessibility,
not backend comprehensiveness.

Targeted hierarchy docs, copy, aria-label, and test updates are preferred
before broader component or data-model renames.

## Accessibility & Inclusion

Target WCAG 2.2 AA minimum across all surfaces. Full keyboard navigation, screen reader support, reduced motion hooks via `prefers-reduced-motion`, sufficient color contrast in both light and dark themes. Compact primary controls provide at least a 44 by 44 CSS pixel touch target.
