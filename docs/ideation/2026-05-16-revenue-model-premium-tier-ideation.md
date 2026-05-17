---
date: 2026-05-16
topic: revenue-model-premium-tier
focus: revenue model, free tier value, premium tier candidates, pricing
mode: repo-grounded
---

# Ideation: Revenue Model And Premium Tier

## Grounding Context

Milkcrate is a Rails/Inertia app that turns a Discogs seller inventory into a tactile public storefront. The current buyer-facing product already includes Milkcrate Picks, featured crates, genre crates, crate browsing, record cards, Discogs outbound links, and a local browser pile. Seller-facing surfaces include `/apply`, invitation pages for unknown stores, and an admin dashboard with store health, sync status, enrichment status, inventory coverage, and applicants.

The current data model is intentionally lean: `stores`, `listings`, `releases`, `daily_selections`, and `waitlists`. There is no billing, subscription state, owner auth, custom pages, custom domains, per-store themes, or analytics pipeline yet.

`STRATEGY.md` already names the freemium shape: prove value with near-zero seller effort, then make paid a no-brainer for deeper features such as full-inventory access and premium placement. It also names the key value metrics: outbound Discogs clicks, pile adds, and crates browsed per session.

Past architecture learnings point toward capability/configuration layered onto shared primitives, not a forked paid storefront. Store customization should extend the existing shared shell, brand, preview, crate strategy, and motion systems. Paid capabilities need server-side entitlement checks and guard-parity tests across responsive branches.

External pricing signals from small-seller ecommerce, creator storefronts, link-in-bio tools, and marketplaces suggest a useful free tier with platform branding, a low paid tier around $9-$15/month, a website-replacement tier around $25-$39/month, and optional higher support or success-fee models. The strongest pattern is to charge when the product replaces a website, proves demand, or creates orders, not merely when it exists.

## Topic Axes

- Free-tier value
- Storefront identity and website replacement
- Curation and merchandising controls
- Analytics and conversion proof
- Operations, cost, and pricing mechanics

## Ranked Ideas

### 1. Free Branded Milkcrate Storefront

**Description:** Every approved store gets a real public storefront on a Milkcrate URL: generated curated crates, Discogs outbound links, basic store description, local pile, Milkcrate branding, and no setup burden. The free tier should be good enough that a store is willing to put it in an Instagram bio or send it to customers the same day.

**Axis:** Free-tier value

**Basis:** `direct:` The existing app already renders public store pages at `/:slug`, builds Milkcrate Picks, featured crates, genre crates, and links records to Discogs. `external:` Free small-seller tools commonly provide a useful hosted page with platform branding and paid upgrades for ownership/customization.

**Rationale:** If free is genuinely useful, the product can spread through stores and buyers without a sales cycle. Milkcrate branding on free pages is not a penalty; it is distribution and trust-building.

**Downsides:** Hosting many free stores creates real sync/enrichment cost, so free needs sensible operational limits.

**Confidence:** 92%

**Complexity:** Medium

**Status:** Unexplored

### 2. Pro Website Mode

**Description:** Package the main premium tier as “make this your record store website,” not “customize colors.” Include custom domain, custom pages, richer store profile, hours/location/contact/social links, SEO metadata, store branding, custom crate order, and reduced or optional Milkcrate branding.

**Axis:** Storefront identity and website replacement

**Basis:** `direct:` The user already framed premium as customization, custom pages, crate order, and “turning it into their website.” `external:` Website builders and ecommerce platforms commonly gate custom domains, pages, SEO, analytics, and branding control behind paid tiers.

**Rationale:** Website replacement is a stronger willingness-to-pay story than cosmetic customization. A store can justify $25-$39/month if Milkcrate replaces a separate site builder and presents their Discogs inventory better than a generic website can.

**Downsides:** Custom domains, SEO, page editing, and ownership flows require more platform infrastructure than simple theme settings.

**Confidence:** 90%

**Complexity:** High

**Status:** Unexplored

### 3. Merchandising Console

**Description:** Paid stores can shape what buyers see: reorder crates, pin records, pin crates, choose featured themes, hide weak genres, schedule seasonal crates, promote new arrivals, and create campaign-like storefront moments.

**Axis:** Curation and merchandising controls

**Basis:** `direct:` The app already has `StorefrontCuration`, `CrateStrategies`, Milkcrate Picks, New Arrivals, Thematic crates, Hidden Gems, and genre crates. Past learnings say monetizable personalization should extend crate strategies rather than special-case storefronts.

**Rationale:** This monetizes control rather than access. Free still shows a strong algorithmic storefront; paid lets serious stores merchandise like they would arrange bins, wall picks, and front-table displays.

**Downsides:** Too much manual control could undermine the “zero effort” pitch, so defaults and automation must stay strong.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 4. Conversion Proof Dashboard

**Description:** Add a paid analytics dashboard focused on proof of demand: outbound Discogs clicks, pile adds, crate opens, record flips, top crates, top records, crates browsed per session, and week-over-week movement. Free can show a small aggregate teaser; paid unlocks item/crate-level detail and trends.

**Axis:** Analytics and conversion proof

**Basis:** `direct:` `STRATEGY.md` already names outbound clicks, pile adds, and crates browsed as key metrics. The admin dashboard already exposes operational summaries, so a seller-facing proof dashboard fits the product shape. `external:` Analytics are a common paid gate in creator storefront and ecommerce tools.

**Rationale:** Small stores may not want generic analytics, but they do want evidence that Milkcrate sends real buyers to Discogs. “Your Japanese jazz crate sent 42 buyers to Discogs this week” is easier to sell than a dashboard full of abstract traffic charts.

**Downsides:** Requires a first-party event pipeline and careful privacy choices. Attribution to actual Discogs sales may remain incomplete unless deeper checkout/order flows exist.

**Confidence:** 86%

**Complexity:** Medium

**Status:** Unexplored

### 5. Free Full Browsing, Paid Merchandising Depth

**Description:** Avoid making the free tier feel hollow by hiding too much inventory. Instead, let free stores show the core browsing experience and gate deeper merchandising: custom crate order, pinned crates, custom campaigns, richer analytics, and possibly full advanced search/filtering.

**Axis:** Free-tier value

**Basis:** `reasoned:` Milkcrate's core promise is that Discogs inventory becomes browsable and discoverable. If free hides too much inventory, the aha moment weakens for both buyers and sellers. Gating store control preserves the buyer experience while creating a clear seller upgrade.

**Rationale:** The paid tier should not punish buyers or make free stores look broken. It should make the store owner feel, “I want more control over this thing that already works.”

**Downsides:** This may reduce the obviousness of “full-inventory access” as a paid gate, which the strategy doc currently names.

**Confidence:** 78%

**Complexity:** Low

**Status:** Unexplored

### 6. Local Pile As A Future Commerce Wedge

**Description:** Treat the local pile as pre-transaction demand. Keep buyer pile saving free, but consider paid seller features around pile intent: “notify me when someone piles records,” hold requests, emailed piles, pickup requests, or lead/success fees where a store gets attributable demand.

**Axis:** Analytics and conversion proof

**Basis:** `direct:` The frontend already has a localStorage pile, while the current purchase handoff goes to Discogs. `external:` Marketplace and creator commerce tools often monetize via success fees or reduced fees on paid plans.

**Rationale:** Discogs owns checkout today, but Milkcrate can still prove and eventually monetize high-intent demand before checkout. This creates an option for revenue aligned with outcomes, not just subscriptions.

**Downsides:** Lead fees can feel awkward if attribution is fuzzy. Any hold/request workflow creates customer-service expectations.

**Confidence:** 72%

**Complexity:** High

**Status:** Unexplored

### 7. Pricing Ladder: Free, Starter, Pro, Concierge

**Description:** Start with a simple ladder:

- Free: $0, Milkcrate URL, Milkcrate branding, generated storefront, core crates, Discogs handoff, basic aggregate proof.
- Starter: $12/month, basic identity controls, crate ordering, basic analytics, richer store profile, still on Milkcrate domain.
- Pro: $29/month or $25/month annual, custom domain, custom pages, SEO, branding controls, advanced analytics, merchandising console.
- Concierge: $79-$99/month, setup help, migration/copy help, priority support, more aggressive sync/enrichment, multi-location or record-fair/vendor features.

**Axis:** Operations, cost, and pricing mechanics

**Basis:** `external:` Comparable creator/storefront tools commonly cluster around free, $9-$15 starter, $25-$39 pro, and $79-$99 advanced/support tiers. `reasoned:` Record stores are likely price-sensitive, so the first paid tier should be a no-brainer, while the real business tier should map to website replacement.

**Rationale:** $29/month is high enough to cover modest hosting/support if a few stores convert, but low enough to compare favorably with site builders and ecommerce tools. Starter gives smaller stores a path without forcing website replacement.

**Downsides:** Too many tiers too early can slow sales and implementation. Initial launch may be better with only Free and Pro, then add Starter/Concierge once demand patterns are visible.

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Basic color customization as the main paid tier | Too weak alone; survives only as part of Website Mode or Starter Identity Pack. |
| 2 | Premium removes Milkcrate entirely | Duplicates Website Mode, and total white-labeling may reduce Milkcrate's trust/distribution value. |
| 3 | Featured placement credits | Interesting, but needs a shared discovery surface or marketplace audience that does not exist yet. Better later. |
| 4 | Success fee as the primary model | Premature while checkout is still on Discogs and attribution is incomplete. Keep as optional future wedge. |
| 5 | Inventory coverage upsell as the main gate | Risky because it weakens the product's core free aha moment. Prefer paid merchandising depth over hiding browsing value. |
| 6 | Automated website from Discogs inventory | Duplicates Website Mode; keep automation as an implementation principle, not a separate product tier. |
| 7 | Admin operations as the main paid retention layer | Useful for internal operations, but less compelling than seller-visible website, merchandising, and proof-of-demand features. |
| 8 | Branding removal as the paid feature | Too commoditized; should be bundled with identity/domain/pages rather than sold alone. |

## Pricing Recommendation

The first shippable pricing model should probably be **Free + Pro**:

- **Free:** $0, Milkcrate-branded generated storefront on a Milkcrate URL.
- **Pro:** $29/month, or $25/month annually, for website mode: custom domain, custom pages, store identity controls, crate ordering/pinning, and conversion proof analytics.

Add **Starter at $12/month** only if stores ask for “make it look like us” but are not ready to use Milkcrate as their website. Add **Concierge at $79-$99/month** only when setup/support becomes a real service burden or when larger vendors want hands-on migration.

This keeps the initial story clean: free proves discovery; paid turns discovery into the store's web presence.
