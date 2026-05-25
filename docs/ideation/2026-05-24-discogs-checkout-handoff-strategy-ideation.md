---
date: 2026-05-24
topic: discogs-checkout-handoff-strategy
focus: satisfying shopper purchase completion and store conversion without a documented Discogs cart API
mode: repo-grounded
---

# Ideation: Discogs Checkout Handoff Strategy

## Executive Finding

The problem should not be framed as "how can Milkcrate secretly populate a
Discogs cart?" It should be framed as:

> How can a shopper preserve the intent of a pile and complete a protected
> purchase from the originating store, while Milkcrate remains a defensible
> Discogs-aligned discovery layer?

There is an important correction to the earlier tactical framing. Discogs'
official **Shop Your Wantlist** experience supports a `Seller` filter. Adding
releases to a shopper's Wantlist does lose the exact listing identity, but it
does not necessarily lose the originating store if the next step deliberately
returns the shopper to that store's matching listings.

There is also a prerequisite larger than cart mechanics: Discogs classifies
inventory, orders, lists, prices, and wantlists as restricted API data. Its API
Terms prohibit commercial use of restricted data and some commercial API uses
without written permission, and prohibit accessing undocumented functionality
or circumventing the marketplace. Unless Milkcrate already has written
authorization outside this repository, store-paid storefronts, conversion
analytics, and any unofficial cart automation need policy confirmation before
they become product promises.

This is product-risk analysis, not legal advice. The right operational response
is to obtain a written answer from Discogs before building revenue or
transaction-critical behavior on these surfaces.

## Grounding Context

### Codebase Context

- `STRATEGY.md` defines Milkcrate as a browsing and discovery layer for
  Discogs stores, with outbound clicks to Discogs as the primary handoff
  metric. It does not position Milkcrate as the marketplace or payment owner.
- `docs/product.md` makes record buyers primary and store owners secondary:
  shoppers should discover records; stores should have character and receive
  useful buyer traffic.
- `app/frontend/components/pile_sheet.tsx` currently experiments with hidden
  iframe GET submissions to `https://www.discogs.com/sell/cart?add=...` and
  then declares that all items were added. This is not a confirmed,
  observable contract on mobile.
- `app/services/create_pile_wantlist_service.rb` and
  `app/services/discogs/shopper_wantlist_client.rb` already implement an
  OAuth-backed Wantlist action using release IDs rather than seller listing
  IDs.
- Git history shows the shopper-list plan was changed to Wantlist integration,
  followed by multiple browser-level cart attempts. That is evidence that the
  distinction between an official user-data action and an exact-listing cart
  action is the unresolved center of the problem.
- `docs/ideation/2026-05-24-mobile-cart-add-discogs.md` remains the tactical
  experiment log. This document considers the product promise and platform
  relationship rather than choosing a browser trick.

### External Context

- Discogs' **Buyer Policy**, last updated January 7, 2026, says all
  transactions must occur through the checkout process supplied on
  `discogs.com`. This aligns with Milkcrate handing purchase completion to
  Discogs rather than processing an order itself.
- Discogs' **Using Filters & Saved Searches** documentation, published
  August 6, 2025, lists `Seller` as a filter in Shop Your Wantlist. This makes
  a store-scoped Wantlist handoff a real product candidate.
- Discogs' **API Terms of Use**, last updated May 27, 2025, identify
  marketplace inventory, orders, lists, pricing, and wantlists as restricted
  data; restrict commercial use of that data; require attribution and link
  back; and prohibit access to undocumented functionality or marketplace
  circumvention.
- Discogs' fee documentation confirms that completed Discogs orders are the
  economic event Discogs protects. A design that sends the resulting purchase
  through Discogs is aligned with both the store's existing workflow and
  Discogs' marketplace role.

### Sources

- [Discogs API Terms of Use](https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use)
- [Discogs Buyer Policy](https://support.discogs.com/hc/en-us/articles/14587773391501-Buyer-Policy)
- [Discogs Using Filters & Saved Searches](https://support.discogs.com/hc/en-us/articles/26355982507149-Using-Filters-Saved-Searches)
- [Discogs Wantlist Feature](https://support.discogs.com/hc/en-us/articles/360007331594-How-Does-The-Wantlist-Feature-Work)
- [Discogs Seller Fees](https://support.discogs.com/hc/en-us/articles/360007521674-What-Are-The-Fees-For-Selling-On-Discogs)

## Success Contract

### Shopper Success

- The shopper can act on the pile without re-searching for every record.
- The handoff preserves the originating seller and makes any loss of exact
  listing fidelity explicit.
- Mobile behavior is honest and predictable even when the Discogs app handles
  links.
- The final order, buyer protection, shipping terms, and payment remain on
  Discogs unless the shopper deliberately chooses a separately disclosed
  store-owned channel.
- Milkcrate does not silently fill a long-lived personal Wantlist merely to
  simulate checkout.

### Store Success

- The shopper is sent back to listings from the store they browsed, not a
  lowest-price marketplace result from another seller.
- The resulting purchase can occur through the store's existing Discogs
  workflow, without asking it to manage a second inventory system by default.
- Milkcrate can eventually demonstrate high-intent handoffs or attributable
  orders, but only with Discogs-authorized measurement.
- The store is not exposed to suspension or platform conflict because a
  storefront depends on unofficial cart behavior or fee avoidance.

### Milkcrate Success

- Milkcrate owns discovery, curation, and intent capture; Discogs owns
  marketplace checkout.
- A failed third-party integration degrades to a usable handoff, not a false
  claim that items reached a cart.
- The product can be explained to Discogs as driving protected marketplace
  purchases, which creates a plausible partnership case.
- Paid features that depend on restricted marketplace data do not launch
  without written permission or a materially different data arrangement.

## Topic Axes

1. **Purchase fidelity:** exact listing, condition, price, and originating seller.
2. **Mobile handoff reliability:** behavior when links open in a browser or the Discogs app.
3. **Store conversion proof:** how a participating store sees buyer value without false attribution.
4. **Discogs alignment:** supported APIs, marketplace checkout, data permissions, and partner incentives.
5. **Product identity:** browsing layer versus a new independent commerce platform.

## Available Tools

| Tool family | What it can do | What it cannot safely promise yet |
|---|---|---|
| Exact Discogs listing links already carried by pile items | Preserve seller and listing identity; let the shopper inspect condition and buy on Discogs | Bulk cart mutation or completed order |
| Shopper OAuth plus documented Wantlist action | Transfer release intent into the shopper's Discogs account | Preserve a particular seller listing by itself |
| Shop Your Wantlist seller filter | Restore store scope after Wantlist transfer and keep checkout in Discogs | Guarantee the originally picked copy, or a programmable deep link until tested/documented |
| Store-owner OAuth and inventory/order APIs | Keep partnered store inventory fresher; potentially confirm sales | Commercial conversion reporting without confirming Discogs permission |
| Outbound analytics | Measure click-through and handoff engagement | Claim orders, cart adds, or sales attribution |
| Discogs business-development request | Seek written commercial/data authorization, supported checkout handoff, and attribution mechanism | Deliver immediate UX without Discogs cooperation |
| Seller-owned catalog and checkout independent of Discogs | Enable first-party carts if a store explicitly chooses another sales channel | Remain merely a Discogs browsing layer or automatically reuse restricted Discogs marketplace data |
| Browser/cart URL experiments | Learn what currently happens on specific devices | Provide a compliant, durable, observable product contract |

## Ranked Ideas

### 1. Discogs-Aligned Purchase Handoff Stack

**Description:** Change the user promise from "Add all to Discogs cart" to
"Take this pile to Discogs." Provide a purchase handoff sheet that preserves
each exact listing and originating store, opens an exact listing for direct
checkout, and offers an opt-in connected-shopper path through idea 2. The
handoff should say what happened: links prepared, Wantlist updated if chosen,
or Discogs opened. It should never claim a cart mutation that Milkcrate cannot
verify.

**Axis:** Purchase fidelity

**Basis:** `direct:` The pile already holds seller-specific `discogs_url` and
`discogs_listing_id` values; the strategy says Discogs is the handoff
destination. `external:` Discogs Buyer Policy requires Discogs checkout for
transactions on its service.

**Rationale:** This is the most defensible baseline. It preserves the exact
store inventory the shopper chose and works even if an app intercepts a link,
because app opening is now a legitimate handoff rather than a failed hidden
automation attempt.

**Downsides:** It is not one-tap carting. A large pile still requires buyer
action unless an official bridge succeeds.

**Confidence:** 92%

**Complexity:** Medium

**Status:** Unexplored

### 2. Seller-Scoped Shop Your Wantlist Bridge

**Description:** For shoppers who explicitly connect Discogs, offer "Shop
these picks from this store on Discogs." Add pile releases to Wantlist through
the existing authenticated action, then direct the shopper into Discogs'
Shop Your Wantlist experience with the originating seller selected or with
clear one-step guidance to select it. Treat this as an intent bridge, not an
exact-cart transfer, and explain that another available copy from the store may
appear when the original listing is no longer available.

**Axis:** Mobile handoff reliability

**Basis:** `direct:` The branch already has shopper OAuth and Wantlist client
code. `external:` Discogs documents a `Seller` filter in Shop Your Wantlist.

**Rationale:** This may turn the apparent failure of Wantlist into the cleanest
supported mobile path: Discogs handles its own app, filters, cart, shipping
eligibility, and checkout while Milkcrate carries the shopper's selected
releases and store intent across the boundary.

**Downsides:** Wantlist is release-based, not listing-based; it can pollute a
shopper's personal wants and notification workflow; the exact deep-link/filter
behavior still needs validation. Use must be clearly opt-in and may need
cleanup controls.

**Confidence:** 82%

**Complexity:** Medium

**Status:** Unexplored

### 3. Permission-First Discogs Commerce Partnership

**Description:** Before committing to paid store conversion features, approach
Discogs with a narrowly aligned proposition: Milkcrate increases discovery for
Discogs sellers and sends all purchases through Discogs checkout. Ask for
written authorization for the commercial storefront model, approved use of
inventory/order data and conversion reporting, and either a documented cart
handoff endpoint or an endorsed seller-scoped checkout mechanism.

**Axis:** Discogs alignment

**Basis:** `external:` Discogs API Terms restrict commercial use of restricted
data and access to undocumented functionality, while Discogs earns fees when
orders remain on its marketplace. `direct:` Milkcrate's strategy depends on
paid store features using marketplace inventory and analytics.

**Rationale:** A platform relationship is the only path that makes true
one-button checkout both durable and business-safe. It also tests whether the
current premium strategy is permissionable before substantial investment.

**Downsides:** Discogs may decline, not respond, or impose limits. It cannot be
the only near-term shopper experience.

**Confidence:** 90% that it is necessary; unknown probability of approval

**Complexity:** Medium organizational effort, low engineering effort initially

**Status:** Unexplored

### 4. Handoff Evidence Instead of Claimed Sales Attribution

**Description:** Until authorized order reconciliation exists, define store
proof around honest intent events: piles created, handoffs initiated, exact
listing opens, and seller-scoped Discogs journeys started. In pilot feedback,
ask stores whether those items appear in subsequent Discogs orders without
claiming automated attribution. If Discogs approves order correlation later,
upgrade the proof model.

**Axis:** Store conversion proof

**Basis:** `direct:` `STRATEGY.md` already identifies outbound clicks and pile
adds as handoff signals rather than sales. `external:` Discogs API Terms
specifically flag marketplace data and marketing analytics as sensitive
surfaces requiring care or permission.

**Rationale:** Stores need evidence that Milkcrate creates buying intent, but a
false conversion dashboard is worse than no dashboard. Honest funnel
measurement can support a pilot and the Discogs partnership request.

**Downsides:** High-intent actions are not revenue. Stores may want stronger
proof before paying.

**Confidence:** 88%

**Complexity:** Low to Medium

**Status:** Unexplored

### 5. Separate Seller-Owned Checkout Lane

**Description:** If selected stores want true one-tap purchasing and Discogs
will not enable it, explore a separate integration in which the store supplies
its own inventory feed and checkout destination independently of Discogs.
Milkcrate may then become the discovery front end for that seller-owned store.
This must be presented as a distinct commerce lane, not as a workaround around
Discogs checkout.

**Axis:** Product identity

**Basis:** `reasoned:` Exact one-tap purchasing requires control of a cart or a
supported cart API. When the marketplace owner will not expose that control,
the only durable alternative is to integrate with a commerce system the store
does control.

**Rationale:** This is the credible challenger if checkout conversion becomes
more important than Milkcrate's current Discogs-layer identity.

**Downsides:** It changes the business materially: inventory synchronization,
payments, tax, returns, seller onboarding, availability conflicts, and brand
positioning all expand. It must not be fed from restricted Discogs marketplace
data without permission.

**Confidence:** 70%

**Complexity:** High

**Status:** Unexplored

## Recommended Direction

Pursue ideas 1, 2, and 3 together as a staged strategy:

1. **Promise an honest Discogs handoff**, not a cart mutation Milkcrate cannot
   verify. The pile is valuable because it records purchase intent from one
   store, even before perfect cart transfer exists.
2. **Test the seller-scoped Wantlist bridge** as the strongest supported mobile
   path. The key validation is whether a connected shopper can reach the
   originating seller's matches in Discogs with tolerable friction and without
   feeling that Milkcrate contaminated their permanent Wantlist.
3. **Open a Discogs permission/partnership conversation immediately.** Treat
   commercial restricted-data use and any eventual cart/attribution feature as
   blocked on a written answer unless existing authorization can be produced.

Idea 4 supplies a pilot measurement posture while this is unresolved. Idea 5
should stay a challenger, not the default: it may ultimately be a sound
business, but it abandons the lightweight "Discogs discovery layer" assumption.

## Viability Probe: Seller-Scoped Shop Your Wantlist

### Provisional Verdict

**Not viable as a replacement for "Add all to Discogs cart." Potentially
viable as an optional, accurately labeled purchasing handoff.**

The reason is structural, not merely an implementation gap: Milkcrate's pile
records listing identity, price, and condition, while the Wantlist write
records a release. Seller filtering narrows the destination back to the
originating store, but it cannot promise that the shopper is buying the same
copy they chose. It also does not isolate the pile from any other releases the
shopper already wanted and that the seller happens to carry.

The option is worth testing only under copy such as **"Find these picks from
this store on Discogs"** or **"Shop releases from your pile on Discogs"**. It
must not be labeled checkout, cart transfer, or exact reservation.

### Gate Matrix

| Gate | Evidence | Status | Meaning |
|---|---|---|---|
| Milkcrate can OAuth-authorize a shopper | Shopper OAuth services and model exist on the branch; original experiment reported successful Wantlist writes | Supported, needs end-to-end regression coverage | Not a blocker for a spike |
| Milkcrate can add pile releases to Discogs Wantlist | `Discogs::ShopperWantlistClient` uses the documented wants endpoint; this was the implemented pivot from Lists | Supported at mechanism level | Release intent can cross over |
| Discogs has a marketplace view of wanted releases | Official Wantlist documentation sends users to Shop My Wants; public references identify `/sell/mywants?ev=wsim` | Supported | There is a legitimate purchase surface |
| Shop My Wants can filter by the originating seller | Official August 6, 2025 Discogs documentation lists a `Seller` filter | Supported as UI behavior | Store intent can be restored after transfer |
| Milkcrate can deep-link with seller already selected | An authenticated human session produced `https://www.discogs.com/shop/mywants/?seller=4616786` after selecting the seller facet; the existing `GET /users/{username}` profile lookup returns a numeric `id` field, verified on May 24, 2026 through `Discogs::PublicClient` for user `teo` (`id=1`) | Promising, mapping not yet proven | Compare the selected seller's profile `id` to `4616786`, then test URL replay |
| Installed Discogs app receives this journey correctly | Mobile app documentation covers Wantlist and purchasing, but does not document Shop My Wants seller-filter handoff | Unverified | Human device test required |
| Selected copy is preserved | Wantlist is keyed to release ID, while a pile item is a seller listing ID | Failed by design | Cannot call this exact checkout/cart transfer |
| The destination contains only pile selections | Seller-scoped Shop My Wants evaluates the shopper's persistent Wantlist, not Milkcrate's pile | Failed by design unless another documented filter exists | Existing wanted releases sold by this store may appear alongside pile additions |
| Shopper Wantlist remains semantically clean | Transfer adds durable wants and may affect Wantlist notifications; no temporary intent concept has been identified | Weak / unverified | Must be explicitly opt-in, removable, or rejected by users |
| Commercial use is permissionable | API Terms classify wantlists and marketplace inventory as restricted data and constrain commercial use | Blocked pending written confirmation | No paid/product promise until clarified |

### Seller Identifier Availability

The new seller-filter URL removes a major user-experience concern if its value
is the Discogs user profile ID. Milkcrate already queries the seller profile at
onboarding through `Discogs::PublicClient#seller_profile`, but
`DiscogsSellerLookup` and `StoreOnboarding` currently discard the profile
`id`; the `stores` table preserves only `discogs_username`.

This does not require scraping if the mapping is confirmed. The implementation
would persist a `discogs_user_id` for each store from the existing profile
lookup, then construct:

```text
https://www.discogs.com/shop/mywants/?seller={discogs_user_id}
```

Two qualifications remain:

1. The presence of `seller={number}` in the web UI is observed behavior, not a
   documented URL contract. It is safer than hidden cart mutation because its
   fallback is a readable Shop My Wants page, but Milkcrate still needs
   monitoring and a graceful fallback if Discogs changes the route.
2. The identifier mapping is not established until the user profile ID for the
   exact seller used in the observed URL equals `4616786`.

### Device Test Protocol

This test requires a real authenticated Discogs shopper session; it should not
be simulated through scraped sessions or stored browser cookies.

1. Pick a participating store with two currently available Milkcrate pile
   items. Record each Discogs listing URL, listing ID, price, and condition.
2. Use two releases not already present in the test shopper's Wantlist, or
   record pre-existing Wantlist membership so cleanup does not delete real
   preferences.
3. Add the two release IDs to Wantlist through the documented OAuth path or
   manually in Discogs if testing only the downstream handoff.
4. Open `https://www.discogs.com/shop/mywants/` while logged in on desktop
   web. Apply the originating seller filter. Record:
   - number of actions from arrival to filtered listings;
   - whether selecting the seller changes the URL;
   - whether reopening the resulting URL in a new logged-in tab retains the
     seller filter;
   - whether both displayed listings match the original listing IDs, prices,
     and conditions.
5. Query the selected seller through the already used profile endpoint and
   confirm that its numeric `id` is the same value in the `seller` URL
   parameter. If it is not, do not implement URL construction from profile
   data.
6. Open the constructed `https://www.discogs.com/shop/mywants/?seller={id}`
   URL in mobile Safari/Chrome with the Discogs app installed. Record whether
   the link remains in the browser, opens the app to a useful screen, loses
   seller scope, or dead-ends.
7. Check whether the app itself offers a way to shop the wanted releases from
   the selected seller. Absence means the handoff must intentionally remain
   browser-based.
8. Remove only the test-generated Wantlist entries and check whether any
   notification or saved-search side effects remain.

### Pass/Fail Criteria

Proceed to requirements brainstorming for this path only if all of the
following are true:

- A shopper reaches listings from the originating seller in at most one
  meaningful Discogs-side action after handoff, or a stable prefiltered URL is
  found.
- The mobile journey has a documented or reproducibly usable browser fallback
  when the installed app cannot preserve the flow.
- The UI labels this as a release/store handoff rather than exact cart transfer.
- Test shoppers consider the Wantlist mutation acceptable when clearly
  disclosed, or Milkcrate can avoid lasting Wantlist pollution without
  removing pre-existing wants.
- Discogs confirms in writing that the intended commercial integration and
  relevant restricted-data use are permitted.

Reject it as a primary checkout solution if the seller filter cannot be
preselected or reached with minimal friction on mobile, if users object to
Wantlist mutation, or if Discogs will not authorize the intended commercial
use.

## Critical Validation Questions

These are questions to answer before selecting a requirements/design path:

1. Does Milkcrate already have written Discogs permission for commercial use
   of restricted marketplace data, paid storefront features, or conversion
   reporting? If not, this is a strategy prerequisite.
2. From mobile web and the installed Discogs apps, can a shopper be delivered
   into Shop Your Wantlist with the originating seller pre-selected, or is one
   manual filter action required?
3. For a pile containing specific listings, how often does seller-scoped
   Wantlist show the same listings versus substitute copies from the same
   seller?
4. Will shoppers accept a clearly opt-in Wantlist mutation for immediate
   purchasing, or do they view Wantlist as a curated long-term personal list
   that Milkcrate should not modify?
5. What is the smallest store-facing proof that earns continued participation:
   outbound handoff counts, observed pilot orders, or true authorized order
   attribution?

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Store shopper session cookies and mutate cart server-side | Creates a sensitive credential custody problem and depends on an unofficial cart action; poor platform and user-trust foundation. |
| 2 | Headless browser that logs in as the shopper and fills the cart | Automated access to Discogs web surfaces is brittle and difficult to reconcile with the API Terms restriction on undocumented/automated access. |
| 3 | Hidden iframe, prefetch, popup, or redirect-chain cart additions as the shipped flow | Useful only as technical experiments; mobile/app handling is unreliable and Milkcrate cannot truthfully verify cart state. |
| 4 | Treat the existing generic Wantlist write as checkout completion | Loses originating-store intent unless paired with a seller-scoped handoff and silently changes a durable personal user list. |
| 5 | Automate messages or reservations so the store invoices separately | Pulls the flow away from Discogs checkout and risks conflict with the protected marketplace transaction model. |
| 6 | Require shoppers to finish on desktop | Valid fallback for a stranded user, but it does not satisfy mobile purchase continuity as a product direction. |
| 7 | Browser extension or bookmarklet running on Discogs pages | Installation cost is too high for storefront conversion and it still depends on unofficial cart behavior. |
| 8 | Claim order conversion from outbound clicks alone | Outbound intent is useful, but it is not a completed order and would undermine store trust if reported as sales. |

## Validation Results (2026-05-24)

All activation gates passed for the seller-scoped Wantlist handoff:

| Check | Result |
|---|---|
| API profile ID matches seller facet URL | ✅ Pass — `philadelphiamusic` ID `420847` matches `?seller=420847` |
| Desktop seller scope survives | ✅ Pass — Shop My Wants loads with seller filter |
| Mobile browser (no app) | ✅ Pass — URL loads with seller scope |
| Mobile browser (with Discogs app) | ✅ Pass — URL stays in browser, seller scope preserved |
| Written commercial permission | ✅ Pass — confirmed by operator |

**Activation posture:** Repository default remains disabled
(`config/settings.yml`). Enable in production via
`SELLER_WANTLIST_HANDOFF_ENABLED=true` environment variable. Store
identities populated via `bin/rails stores:discogs_identity[username]`.

---

## Next Branch Point

The next brainstorm should choose between:

- **Discogs-aligned handoff product:** define the shopper experience for exact
  links plus optional seller-scoped Wantlist transfer.
- **Permission/partnership brief:** define the Discogs request, pilot evidence,
  and the minimum supported capability Milkcrate needs.
- **Independent commerce challenger:** explicitly decide whether Milkcrate is
  willing to become more than a Discogs browsing layer.
