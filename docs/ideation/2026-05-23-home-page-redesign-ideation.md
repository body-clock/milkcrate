---
date: 2026-05-23
topic: home-page-redesign
focus: Buyer-led homepage with seller storefront path for Discogs buyers and sellers
mode: repo-grounded
---

# Ideation: Home Page Redesign

## Grounding Context

Milkcrate is a Rails/Inertia app for browsing a Discogs seller's vinyl inventory as curated crates. The product strategy names record buyers as the primary audience: Milkcrate helps online record browsing feel like walking into a record store, using spatial bins, walls, genre sections, and algorithmic curation. Sellers matter because they get a browsable storefront from the inventory they already maintain on Discogs.

The current homepage is structurally seller-first. `config/locales/en.yml` leads with "Your Discogs inventory, now a storefront," and `app/frontend/pages/home.tsx` explains seller setup steps before the broader marketplace loop is clear. That creates the ambiguity the redesign needs to solve: buyers should immediately understand why browsing a Milkcrate store is different from searching Discogs, while sellers should immediately see that buyer experience as the reason to claim a storefront.

The product already contains the strongest marketing asset: real store browsing UI. `app/frontend/pages/stores/show.tsx`, `app/frontend/components/store_floor.tsx`, `app/frontend/components/crate_view.tsx`, and `app/frontend/components/crate_shelf.tsx` already express the record-store metaphor through cover walls, crates, genre bins, tactile navigation, and a local pile. Existing design guidance in `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` says marketing and product surfaces should share `BrandMark`, `MilkcrateShell`, preview primitives, viewport tiers, motion tokens, and the record/crate visual vocabulary.

External research supports a buyer-led page with a seller path instead of an equal split. Discogs buyer docs emphasize search, filters, wantlists, seller lookup, and transaction safety. Discogs seller docs emphasize listing, inventory management, bulk edits, filtering, pricing, and order progression. CrateScout validates the Discogs-inventory-to-discovery seller pitch, but leans on generic AI/customer-matching language. Two-sided marketplace examples generally avoid forcing both audiences into one generic hero: Airbnb and Etsy have dedicated host/seller pages, OpenTable and Tock separate diner discovery from restaurant-operator outcomes, Bandcamp explicitly links fan discovery to artist storefront value, and Reverb makes shops buyer-followable through saved shops and saved searches.

Sources:

- Discogs buyer flow: https://support.discogs.com/hc/en-us/articles/360001573434-How-To-Buy-Music-On-Discogs
- Discogs seller docs: https://support.discogs.com/hc/en-us/articles/360001562473-How-To-Sell-Music-On-Discogs
- Discogs inventory docs: https://support.discogs.com/hc/en-us/articles/360007714754-How-Can-I-Manage-My-Inventory
- CrateScout: https://www.cratescout.com/
- Airbnb host page: https://www.airbnb.com/host/homes
- Etsy seller page: https://www.etsy.com/sell
- Bandcamp fans/artists pages: https://bandcamp.com/fans and https://bandcamp.com/artists
- Reverb shops/favorites docs: https://help.reverb.com/hc/en-us/articles/41988459644699-How-do-I-search-for-a-specific-shop and https://help.reverb.com/hc/en-us/articles/41988383227163-How-to-use-Favorites
- OpenTable restaurant solutions: https://www.opentable.com/restaurant-solutions/
- Tock/Squarespace restaurant page: https://www.squarespace.com/tock

## Topic Axes

- Audience hierarchy and page architecture
- Buyer discovery proof
- Seller storefront value
- Mobile-first conversion path
- Shared product/marketing design language

## Ranked Ideas

### 1. One-Page Storefront Lobby, Not Equal Split Messaging

**Description:** Use one primary homepage now, but stop trying to make one hero speak equally to buyers and sellers. Lead with the buyer experience because that is the product proof: buyers browse Discogs sellers like they are in a record store. Then give sellers a strong, obvious path inside the same page: claim/request a storefront, understand the zero-effort setup, and see the future customization promise.

**Axis:** Audience hierarchy and page architecture

**Basis:** `direct:` `STRATEGY.md` names buyers as primary, while `config/locales/en.yml` currently leads with seller copy. `external:` Airbnb, Etsy, OpenTable, and Tock all separate or strongly route supply-side business pitches rather than forcing both audiences into one generic headline.

**Rationale:** The homepage should make the marketplace loop legible: buyers browse stores; sellers claim the storefront buyers want to browse. Equal hero messaging would blur the product again.

**Downsides:** Sellers may need one extra scroll or tap to reach their pitch. Mitigate with a header link, hero secondary CTA, and seller anchor.

**Confidence:** 92%

**Complexity:** Low-Medium

**Status:** Explored

### 2. Hero As A Working Mini-Store

**Description:** Replace the static marketing-first hero with a mobile-first working preview of the Milkcrate experience: cover art, crate label, pile affordance, and a direct path into the demo store. The hero should feel like the first few feet inside a store, not a SaaS brochure.

**Axis:** Buyer discovery proof

**Basis:** `direct:` `app/frontend/pages/home.tsx` already renders `CrateView` preview data, and `README.md` documents live store routes like `/philadelphiamusic`; strategy says the browse should feel like walking into a record shop.

**Rationale:** A playable preview answers "who is this for?" faster than copy. Buyers see the benefit immediately; sellers see what their Discogs inventory can become.

**Downsides:** Needs careful payload/performance handling and a non-empty demo fallback.

**Confidence:** 90%

**Complexity:** Medium

**Status:** Unexplored

### 3. Seller Claim Band: "Already Selling On Discogs? Give Buyers A Storefront."

**Description:** Add a seller-specific band or section that makes the supply-side value concrete: keep Discogs for inventory and checkout; Milkcrate becomes the browsable front room. During beta, the CTA should avoid overpromising full self-serve claiming.

**Axis:** Seller storefront value

**Basis:** `direct:` the app has `/apply`, OAuth claim routes, and the strategy's free demo to paid OAuth path. `external:` CrateScout validates "turn Discogs inventory into customer magnet" as a seller hook, but uses generic AI/customer-matching language Milkcrate can avoid.

**Rationale:** The seller pitch should be concrete and operational. This avoids making sellers think they need to migrate ecommerce systems.

**Downsides:** "Claim" can overpromise until onboarding is fully self-serve; copy may need "early storefront" or "request setup" during beta.

**Confidence:** 88%

**Complexity:** Low

**Status:** Unexplored

### 4. The Marketplace Loop Section

**Description:** Add a compact section that connects both audiences without splitting the page: buyers dig through crates; stores get a shareable storefront; Discogs still handles the sale. Keep it qualitative until first-party metrics exist.

**Axis:** Audience hierarchy and seller storefront value

**Basis:** `reasoned:` sellers do not buy "a prettier page" in isolation; they buy the belief that buyers will browse longer, build piles, and click through to Discogs. `direct:` strategy's metrics are outbound clicks, pile adds, and crates browsed.

**Rationale:** This can become the conceptual bridge of the page and explain why the same product matters to both audiences.

**Downsides:** Without live metrics, it must not become fake SaaS analytics.

**Confidence:** 84%

**Complexity:** Low

**Status:** Unexplored

### 5. Shared Product/Marketing Design Language

**Description:** Make marketing feel like the product. Use the same warm tokens, crate shelves, record tiles, tactile motion, compact typography, and "pile/dig/crate" language instead of generic SaaS cards.

**Axis:** Shared product/marketing design language

**Basis:** `direct:` `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` says marketing, store, and apply surfaces should share `BrandMark`, `MilkcrateShell`, preview primitives, responsive tiers, and record/crate visual vocabulary.

**Rationale:** The product is the pitch. If the page feels unlike the product, the store metaphor weakens before anyone opens a demo.

**Downsides:** Reusing full interactive product components in marketing can bring context/provider complexity; prefer bounded preview primitives where possible.

**Confidence:** 91%

**Complexity:** Medium

**Status:** Unexplored

### 6. Mobile QR Path For Record Fairs

**Description:** Assume many first visits happen from a phone after a card, bag, table sign, or social link. The first interaction should be browseable within seconds, with compact CTAs for browsing the demo and requesting a seller storefront.

**Axis:** Mobile-first conversion path

**Basis:** `direct:` `STRATEGY.md` names the June 6, 2026 record fair as an acquisition milestone. `external:` Tock/OpenTable frame operator value around reach and conversion channels, not just software features.

**Rationale:** The record-fair path gives the page a concrete acquisition context without making the whole product event-only.

**Downsides:** Too much record-fair framing can make the product feel narrow; keep it as one section or callout.

**Confidence:** 82%

**Complexity:** Low-Medium

**Status:** Unexplored

### 7. Premium Tease As Store Character, Not Theme Settings

**Description:** Tease premium customization as "make it feel like your shop" with examples of different storefront moods or section names, not as a color picker. The free generated store should still feel complete.

**Axis:** Seller storefront value and shared design language

**Basis:** `direct:` strategy names custom pages, identity controls, and theming as paid partnership value; `StorefrontTheme` exists in the model layer.

**Rationale:** This supports seller aspiration without making current free/demo storefronts feel broken or under-featured.

**Downsides:** Must avoid implying customization is already available if it is not.

**Confidence:** 78%

**Complexity:** Medium

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Full separate buyer and seller homepages now | Premature. One well-structured page can answer the current ambiguity; separate pages become useful when pricing/onboarding depth grows. |
| 2 | Equal buyer/seller split hero | Recreates the clarity problem by refusing to choose a primary first-screen job. |
| 3 | Lead with seller-only positioning | Conflicts with strategy, which names record buyers as primary, and weakens the seller proof. |
| 4 | Lead with AI matching | External competitors already use generic AI language; Milkcrate's stronger differentiation is record-store browsing. |
| 5 | Fake dashboard or metric cards | No grounded metrics yet; would look like unsupported SaaS proof. |
| 6 | Attack Discogs directly | Milkcrate depends on Discogs for inventory and checkout; complementary framing is more credible. |
| 7 | Long editorial brand story | On-brand but too slow for mobile QR traffic and does not resolve audience routing. |
| 8 | Immediate pricing section | Premium direction matters, but pricing is not ready enough to carry homepage clarity. |
| 9 | Pure aesthetic redesign | The actual issue is product-positioning architecture, not just visual polish. |
| 10 | Desktop-first split media hero | Violates the mobile-first constraint and would make the product demo feel secondary on phones. |

## Recommended Next Step

Run `compound-engineering:ce-brainstorm` on idea 1, with ideas 2, 3, 4, 5, and 6 treated as supporting scope. The brainstorm should produce a concrete mobile-first page structure and copy brief before implementation planning.
