---
date: 2026-05-14
topic: vendor-facing-marketing-page
focus: Marketing landing page that sells Milkcrate to record-fair vendors
mode: repo-grounded
---

# Ideation: Vendor-Facing Marketing Page

## Grounding Context

Milkcrate is a Rails 8 + Inertia React app for browsing a Discogs seller's vinyl inventory as curated crates. The current public surface has a marketing homepage at `/`, a seller application form at `/apply`, and live store pages at `/:discogs_username`.

The product strategy says the target problem is that Discogs is strong for search but weak for discovery: a buyer can find a known record, but cannot browse a store's collection like they would in a physical shop. The approach is to make online record browsing feel like walking into a record store, using spatial bins, walls, genre sections, and a digger's algorithm that surfaces interesting records.

The seller-facing strategic track is especially relevant here: "Prove value with near-zero seller effort — a store connects their API key and gets a storefront with no setup required. The free tier demonstrates the product; a paid tier at a no-brainer price unlocks deeper features."

Current homepage issues:

- `app/frontend/pages/home.tsx` is short and generic: milk emoji, headline/subhead, two CTAs, three explanation blocks, and decorative crate thumbnails.
- `MarketingLayout` uses a wordmark with an emoji and a theme toggle, but no vendor-specific navigation, proof, or story.
- The current copy explains how buyers browse, but it does not directly sell the vendor outcome: "I can have a real web presence from the inventory I already maintain."
- The brand docs reject generic SaaS treatment and call for warm, tactile, record-store-at-golden-hour presentation.
- The app already has a live demo route (`/philadelphiamusic`) and an apply route, so the marketing page can anchor on a tangible before/after without inventing new backend capability.

Past learnings that apply:

- The storefront animation token system favors tactile, spring-based interaction and reduced-motion support. Marketing interactions should reuse that feel rather than introduce unrelated animation language.
- The viewport architecture docs emphasize responsive tiers and tested mobile behavior. The record-fair use case likely starts on a phone after scanning a card, so mobile-first presentation is not optional.

External context:

- Discogs' own buyer support frames discovery around search, filters, and seller inventory navigation, including "u:username" search and "View more from this seller." That reinforces Milkcrate's opening: Discogs has inventory and transaction rails, but the browsing experience is not a shopfront.
- CrateScout positions itself to record shops with "Turn your Discogs inventory into a customer magnet," "Effortless Setup," and "Zero maintenance required." That validates the seller pain, but its language is generic AI/customer-matching SaaS. Milkcrate can differentiate with store character, not dashboards.
- RecordRadar's seller pitch emphasizes one-click Discogs inventory import and record-fair discovery. That directly validates the record-fair acquisition context.
- Recent Discogs community threads show collectors asking how to browse a known seller's inventory like a brick-and-mortar shop, and praising clean, visual, stack-style browsing as easier and more fun than the official Discogs experience.

Sources:

- Discogs buying flow: https://support.discogs.com/hc/en-us/articles/360001573434-How-To-Buy-Music-On-Discogs
- CrateScout seller positioning: https://www.cratescout.com/
- RecordRadar seller positioning: https://recordradar.com/seller/join
- Discogs seller inventory browsing thread: https://www.reddit.com/r/discogs/comments/1sognnm/searching_individual_sellers_inventory/
- SnapVinyl visual browsing feedback: https://www.reddit.com/r/discogs/comments/1pc80hn/snapvinyl_a_clean_discogs_client_i_built_as_a/

## Topic Axes

1. **Vendor hook** — the first-screen promise and emotional frame for a vendor with no website.
2. **Live proof** — showing a real Discogs inventory transformed into a browsable storefront.
3. **Zero-effort onboarding** — making the setup feel safe, small, and non-technical.
4. **Store character** — proving this is not a generic template or marketplace listing.
5. **Record-fair conversion** — making the QR/card moment immediate, memorable, and action-oriented.

## Ranked Ideas

### 1. "Your Discogs Inventory, But It Finally Feels Like Your Shop"

**Description:** Rebuild the hero around the vendor transformation, not the browsing mechanic. The first viewport should make the page feel like a storefront being assembled from real record covers: a plain Discogs-style inventory column on one side visually becomes warm crates, picks, and genre bins on the other. The copy should speak directly to the vendor: "You already listed the records. Milkcrate turns them into a storefront people want to browse."

**Axis:** Vendor hook

**Basis:** `direct:` Strategy says onboarding should prove value with near-zero seller effort, while current `home.tsx` starts with a milk emoji and generic browse explanation. `external:` CrateScout and RecordRadar both validate "connect Discogs inventory" as the seller hook, but Milkcrate's brand docs reject generic SaaS positioning.

**Rationale:** A record-fair vendor who scans the URL is asking "what is this, and why should I care?" The strongest answer is not "buyers can flip through crates." It is "the inventory you already maintain can become a shopfront with character."

**Downsides:** Requires careful visual execution. If the before/after comparison looks like a fake dashboard, it will undercut the tactile brand.

**Confidence:** 92%

**Complexity:** Medium

**Status:** Unexplored

### 2. Make the Live Store Demo the Product, Not a Secondary Button

**Description:** Replace the decorative thumbnail section with an embedded "live shop preview" module that uses the existing `/philadelphiamusic` data style: record covers, crate labels, picks, and a clear "Open the live demo" affordance. The page should show enough real storefront surface that a vendor understands what their own URL could look like before they click away.

**Axis:** Live proof

**Basis:** `direct:` README documents `/philadelphiamusic` as the demo store route, and current homepage already links to it. `direct:` current `CrateThumbnail` components are decorative warm blocks, not actual records or a real store proof.

**Rationale:** The user is handing someone a card in a noisy physical environment. A real preview reduces explanation cost and makes the product tangible. It also prevents the page from reading like another "AI storefront" claim.

**Downsides:** Needs robust handling when demo data is missing locally or unavailable. Real cover art can make layout and performance more sensitive.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 3. "No Website, No Catalog Cleanup, No New Workflow" Section

**Description:** Add a compact vendor onboarding section that spells out the seller path in three concrete steps: connect Discogs, Milkcrate syncs and curates, share your Milkcrate URL. Keep it framed as operational relief, not setup documentation. Use plain language like "Keep selling on Discogs. Let Milkcrate handle the front window."

**Axis:** Zero-effort onboarding

**Basis:** `direct:` Strategy explicitly says "near-zero seller effort" and "connects their API key." `direct:` current `/apply` form asks for store name, Discogs username, email, inventory size, and notes, but the homepage does not prepare a seller for how little is required.

**Rationale:** Vendors without websites are likely sensitive to setup burden, ongoing maintenance, and whether this competes with Discogs. This section should remove those objections before the apply CTA.

**Downsides:** Must avoid overpromising if API-key onboarding is not yet fully self-serve. The copy should say "apply" or "join early access" until the flow is actually automated.

**Confidence:** 90%

**Complexity:** Low

**Status:** Unexplored

### 4. Storefront Character Wall: "Not a Template, Not a Marketplace Page"

**Description:** Add a section showing how Milkcrate expresses store character: crates by genre, daily rotation, new arrivals, oddball picks, and a store description. Instead of feature cards, make it a visual wall of store moments with short captions: "front wall," "fresh arrivals," "deep section," "daily dig." This should contrast with Discogs without attacking it: Discogs handles the transaction, Milkcrate handles the browse.

**Axis:** Store character

**Basis:** `direct:` Product docs say each store's character should come through and premium customization should never feel like a white-label template. `direct:` README lists Milkcrate Picks, featured crates, genre crates, crate view, and pile as the actual browsing model.

**Rationale:** The vendor's emotional purchase is not only "more clicks." It is "my shop finally looks like my shop online." This idea turns existing product mechanics into a marketing story.

**Downsides:** Needs strong art direction. Captions must stay concrete and avoid drifting into vague brand adjectives.

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

### 5. Record-Fair Callout: "Put This URL on the Card, Bag, or Price Tag"

**Description:** Add a record-fair-specific band near the CTA: a vendor-facing use case for cards, QR codes, table signage, and follow-up after the fair. Example message: "Someone likes your bins but walks away? Give them a URL that still feels like your bins." Pair it with a simple mock of a card or table sign that points to a Milkcrate storefront.

**Axis:** Record-fair conversion

**Basis:** `direct:` Strategy milestone names the 2026-06-06 Philamoca record fair, branded bags, URL distribution, and vendor interest gathering. `external:` RecordRadar explicitly markets record-fair inventory discovery, validating that the fair setting is a real acquisition context.

**Rationale:** This is the moment the user described. Naming it on the page makes Milkcrate feel purpose-built for the vendor's immediate world, not a generic web product they need to translate into their own use case.

**Downsides:** Too much record-fair specificity could make the product feel less relevant to brick-and-mortar stores unless balanced with broader "share your storefront anywhere" language.

**Confidence:** 82%

**Complexity:** Low-Medium

**Status:** Unexplored

### 6. Proof Without Metrics: "A Better First Impression Than a Seller Page"

**Description:** Instead of SaaS-style metric cards, show a direct comparison of the buyer's mental experience: Discogs seller page as rows, filters, grading, and marketplace context versus Milkcrate as picks, crates, cover art, and a pile. The point is qualitative: people browse longer when browsing feels human.

**Axis:** Live proof

**Basis:** `direct:` Product anti-references reject Discogs-style data density and hero metric templates. `external:` Discogs support explains browsing through marketplace filters and "View more from this seller"; Reddit collectors praise big artwork, genre browsing, and stack layouts because they make browsing feel fun rather than cramped.

**Rationale:** Early-stage marketing probably cannot claim conversion lift yet. A qualitative proof section is more honest and more brand-consistent than fake-looking analytics cards.

**Downsides:** Comparison must be tasteful. A hostile anti-Discogs tone would be risky because Milkcrate depends on Discogs inventory and checkout.

**Confidence:** 78%

**Complexity:** Medium

**Status:** Unexplored

### 7. Apply CTA as "Claim an Early Storefront"

**Description:** Rename and reshape the apply CTA so it feels like claiming a useful presence, not filling out a waitlist form. The homepage CTA could become "Claim an early storefront" with supporting text that says it takes one minute and starts with a Discogs username. The `/apply` page can remain the form, but the landing page should set a stronger expectation.

**Axis:** Zero-effort onboarding

**Basis:** `direct:` `/apply` already collects lightweight seller information, including Discogs username and inventory size. `direct:` current homepage CTA is generic `copy.cta_apply`, and the current page gives little seller-specific motivation before sending users there.

**Rationale:** "Apply" sounds like work and possible rejection. "Claim an early storefront" maps better to the vendor's desired outcome while still being compatible with a manual early-access workflow.

**Downsides:** Needs honest wording if not every applicant will receive a storefront quickly. "Claim" may overpromise availability.

**Confidence:** 80%

**Complexity:** Low

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Add a big AI recommendation hero | Too generic and would fight the product's warm, tactile positioning. |
| 2 | Lead with buyer benefits only | Duplicates current page weakness; the record-fair context requires a vendor-first hook. |
| 3 | Add pricing cards immediately | Not grounded enough in current product state; strategy mentions freemium, but no concrete pricing appears in the app. |
| 4 | Full landing page with testimonials | Useful later, but there is no grounded testimonial source in the repo. |
| 5 | Turn homepage into a long product manual | Too much cognitive load for a scanned-card moment. |
| 6 | Build a fake analytics dashboard preview | Conflicts with anti-SaaS design guidance and risks unsupported claims. |
| 7 | Heavy nostalgia/photo essay about record culture | On-brand atmosphere, but weaker at explaining the vendor outcome. |
| 8 | Attack Discogs directly | Milkcrate depends on Discogs as inventory and transaction infrastructure. Better framing is complementary. |
| 9 | Add a newsletter/content marketing surface | Scope overrun; does not improve the immediate vendor conversion page. |
| 10 | QR-code generator on the homepage | Potentially useful later, but not necessary to communicate the core value. |

## Recommended Next Step

Run `compound-engineering:ce-brainstorm` on idea 1, with ideas 2, 3, and 5 treated as required supporting sections. That would define the exact page structure, copy direction, visual assets, and implementation constraints before coding.
