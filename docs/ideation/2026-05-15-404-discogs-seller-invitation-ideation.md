---
date: 2026-05-15
topic: 404-discogs-seller-invitation
focus: Turn the 404 page into an invitation for Discogs sellers to apply
mode: repo-grounded
---

# Ideation: 404 Page → Discogs Seller Invitation

## Grounding Context

**Codebase context:** Rails 8 + Inertia.js + React app (milkcrate.fm). Online record store browsing powered by Discogs inventories.

- **404 page:** Currently `app/views/stores/no_stores.html.erb` — plain ERB rendered by `StoresController#show` when `/:slug` doesn't match a known `Store`. Shows "🎵 No stores in rotation yet."
- **Apply page:** `/apply` — Inertia/React page with form fields: name, discogs_username, email, inventory_size, notes + Turnstile captcha.
- **DiscogsClient:** Has `seller_profile(username)` calling `GET /users/{username}` — can verify Discogs username exists. Already wired, used by StoreSyncService.
- **No existing redirect-with-query-param pattern** in codebase. Apply uses flash-only redirects.
- **Store model:** `discogs_username` (unique), sync_status/enrichment_status enums.
- **Waitlist model:** `discogs_username` (unique), name, email, inventory_size, notes.
- **Strategy:** "Store onboarding & freemium model" — prove value with near-zero seller effort.

**External context:** Web research unavailable (no web tools in environment). Internal codebase and learnings only.

## Topic Axes

1. **Discovery & Verification** — How the system detects a visitor may be a Discogs seller for the slug they tried.
2. **Invitation Message & Tone** — What the page communicates and how it sells the value.
3. **Form Pre-fill & Redirection Flow** — How `discogs_username` propagates from the slug through query params to the apply form.
4. **Edge Cases & States** — Slug already claimed, username doesn't exist on Discogs, already applied, garbage slug.
5. **Onboarding Continuity** — Post-application experience, previews, state persistence.

## Ranked Ideas

### 1. Silent Discogs Identity Probe on Slug Miss

**Description:** When `/:slug` doesn't match a Store, call `DiscogsClient#seller_profile(slug)` server-side before rendering. Pass a `:discogs_seller_exists` boolean to the view. If true, render personalized invitation copy ("We found /{slug} on Discogs — this URL could be your storefront"). If false, render generic invite ("This URL is available — claim it for your store"). A lightweight slug sanity check (length, character class) gates the API call to avoid rate-limit waste on garbage paths.

**Axis:** 1 — Discovery & Verification

**Basis:** `direct:` `DiscogsClient#seller_profile(username)` at `app/services/discogs_client.rb:44-46` calls `GET /users/{username}` and returns the user object. Already wired and used in `StoreSyncService`. `direct:` `StoresController#show` at `app/controllers/stores_controller.rb:10-14` already has `params[:slug]` — the value is accessible at the point of the `render :no_stores` decision.

**Rationale:** Currently the 404 is blind — a real Discogs seller and a bot typing garbage get identical treatment. A single API call flips the page from "nothing here" to "we found you" with zero visitor effort. This is the cheapest, highest-leverage change because it front-ends every other idea in the set.

**Downsides:** Adds ~200-800ms latency to slug misses when API call fires. Discogs API rate limit must be respected (can gate with slug heuristic + per-IP throttling).

**Confidence:** 95%

**Complexity:** Low

**Status:** Unexplored

---

### 2. Personalized Invitation with Query-Param Propagation to /apply

**Description:** Replace the generic "No stores in rotation yet" with contextual copy. When the Discogs probe succeeds: "Hey {slug} — your Discogs profile checks out. **Claim this URL** as your storefront." When it fails: "This URL is waiting for its owner. If you sell records on Discogs, **claim it here**." The CTA links to `/apply?discogs_username={slug}`. On the Inertia/React apply page, `useForm` reads the query param and pre-fills the `discogs_username` field (optionally locked/read-only). Establishes the redirect-with-query-param pattern as the documented Inertia approach.

**Axis:** 2 (Invitation Message & Tone) + 3 (Form Pre-fill & Redirection Flow)

**Basis:** `direct:` Vendor marketing ideation at `docs/ideation/2026-05-14-vendor-facing-marketing-page-ideation.md` proposed "Claim an Early Storefront" framing — this is the natural home for it. `direct:` Grounding confirms "No existing redirect-with-query-param pattern in codebase" — building it here establishes the pattern. `direct:` Apply form initializes `discogs_username: ""` at `apply.tsx:62` — pre-filling from URLSearchParams is a local React change.

**Rationale:** Any seller who typed the slug into the URL bar has zero patience for retyping it into a form. Dropping the username into the form automatically is the difference between "eh, maybe later" and "oh, it's already there." The personalized copy turns a dead-end into a funnel.

**Downsides:** New pattern to document. Need to decide whether field is read-only or editable. Flash-only redirects need updating.

**Confidence:** 90%

**Complexity:** Low-Medium

**Status:** Explored

---

### 3. State-Aware 404 with Waitlist Cross-Reference

**Description:** Before rendering the 404 invitation, check the Waitlist table for `discogs_username = params[:slug]`. Three states: (A) slug not in Waitlist or Store → full invitation. (B) slug in Waitlist → "Someone has already applied for this URL. Is that you?" with a masked-email hint. (C) slug in Store → should never reach 404 (safety redirect). Prevents the confusing "dead page" experience for returning applicants.

**Axis:** 4 — Edge Cases & States

**Basis:** `direct:` `Waitlist` model at `app/models/waitlist.rb:4` has `discogs_username` with `uniqueness: true`. Querying `Waitlist.exists?(discogs_username: params[:slug].downcase)` is a single ActiveRecord query. `direct:` `Store.with_discogs_username` scope at `store.rb:9` already does the normalized lookup.

**Rationale:** The most frustrating outcome — someone who already applied visiting "their" URL and seeing a dead 404 — costs one query to prevent. It also surfaces the waitlist-to-store lifecycle gap.

**Downsides:** Need copy for "already applied" state. Privacy concern with surfacing that a particular email applied. Best addressed with partial masking.

**Confidence:** 85%

**Complexity:** Low

**Status:** Unexplored

---

### 4. One-Click Claim from the 404 Page (Verified Sellers)

**Description:** When the Discogs probe confirms the slug IS a real Discogs seller AND no Waitlist entry or Store exists, offer a single "Claim this storefront" button directly on the 404 page. Clicking POSTs to `WaitlistsController#create` with `discogs_username` pre-filled. No redirect to `/apply`. No form. Optionally collect email via a lightweight inline overlay. The apply page at `/apply` still exists for general sign-ups and non-verified slugs.

**Axis:** 1 (Discovery & Verification) + 3 (Form Pre-fill & Redirection Flow)

**Basis:** `direct:` Strategy doc says "Prove value with near-zero seller effort." `direct:` `WaitlistsController#create` at `waitlists_controller.rb:9-17` accepts `discogs_username` as a permitted param. `direct:` `DiscogsClient#seller_profile` enables the verification gate. `reasoned:` The remaining fields (name, inventory size, notes) are nice-to-have but not required for initial intent capture; they can be collected via email follow-up.

**Rationale:** This is the strongest expression of "near-zero seller effort." The full apply form has 5 fields + captcha — even with pre-fill, the visitor must fill name, email, inventory size, notes. A one-click path converts visitors who have high intent but low patience.

**Downsides:** Requires making Waitlist email optional or collecting it inline. Higher technical complexity (inline form vs. redirect). Risk of accidental claims (but Discogs identity is hard to "accidentally" own).

**Confidence:** 75%

**Complexity:** Medium

**Status:** Explored

---

### 5. Post-Apply Continuity — Preview at Slug URL After Submission

**Description:** After a seller submits their application (from any entry point), redirect back to `/:slug` with a session/cookie flag. The 404 page now recognizes they've claimed this slug and shows "You've claimed this URL! Here's a preview of what your storefront will look like" — rendered from their actual Discogs inventory via `DiscogsClient#seller_listings(username, page: 1, per_page: 12)`. The preview is a sample of their records in the milkcrate layout, with a "Share your coming-soon page" link. Persists across repeat visits (via Waitlist lookup) until the Store is created.

**Axis:** 5 — Onboarding Continuity

**Basis:** `direct:` `DiscogsClient#seller_inventory` at `discogs_client.rb:16-25` fetches paginated listings. `direct:` The slug URL is the only URL the visitor knows — it's the natural post-claim destination. `direct:` Waitlist lookup by `discogs_username` enables cross-session persistence without auth. `reasoned:` The biggest drop-off in waitlist funnels is "submission → nothing happens." A live preview immediately after application bridges this gap and keeps engagement alive during provisioning.

**Downsides:** Requires session/cookie detection on the 404 page. Live API call on every post-apply visit. Preview component needs to handle partial data gracefully.

**Confidence:** 70%

**Complexity:** Medium-High

**Status:** Unexplored

---

### 6. Tiered Slug Gating (Quality Gate)

**Description:** Before any of the above logic fires, classify the slug into tiers: (A) **Plausible Discogs username:** alphanumeric, 3-40 chars, no path separators, not a reserved route — run the Discogs probe. (B) **Gray zone:** longer slug, mixed characters — show generic "This URL is available" invitation without API call. (C) **Garbage:** SQL-like patterns, very long, typical bot paths — skip all invitations, show minimal 404 or redirect to homepage. Protects the Discogs API rate limit and keeps analytics clean.

**Axis:** 4 — Edge Cases & States

**Basis:** `direct:` The grounding note on `no_stores.html.erb` — currently ALL misses are treated identically. `reasoned:` Not every 404 visitor is a seller. Bots, typos, and random probes will hit `/:slug`. Running an API call on every miss wastes budget and pollutes conversion analytics. A lightweight heuristic gates the expensive probe. `external:` Etsy, Bandcamp, and Depop all filter slug availability with similar heuristics.

**Rationale:** Without this gate, every other idea in this set is vulnerable to both rate-limit exhaustion and noisy analytics. A simple slug sanity check protects the entire pipeline.

**Downsides:** False negatives — a legitimate seller with an unusual username could get the generic invitation instead of personalized. Need a reasonable heuristic that errs on the side of inclusion.

**Confidence:** 95%

**Complexity:** Very Low

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Digest-Highlight / Inventory Preview (live preview on 404) | Too expensive relative to value — live inventory API call on every 404 with full rendering is heavy; better as post-apply reward |
| 2 | Auto-Verify and Skip Waitlist Entirely | Too aggressive — creating Store records without manual review risks abuse |
| 3 | Provisional Storefront (session-scoped temp store) | Interesting but requires architectural changes to storefront rendering pipeline |
| 4 | Kickstarter "Notify Me" (username-only capture) | Adds another data model tier — better to simplify the apply form itself |
| 5 | Garbage-Slug ML Classifier | Scope overrun — simple heuristic enough for current needs |
| 6 | Competitor-Slug Interest Heatmap | Expensive relative to value at current traffic levels |
| 7 | Referral-Embedded Apply URLs | Premature — referral tracking before product-market fit is scope overrun |
| 8 | Wikipedia "Did You Mean?" Suggestion | Low confidence accuracy — fuzzy Discogs username matching without local cache |
| 9 | "This Domain Is Available" declarative framing | Doesn't account for Discogs identity verification — mixed signals |

## Implementation Order (Recommended)

1. **Tiered Slug Gating (#6)** — prerequisite, protects everything below
2. **Silent Discogs Identity Probe (#1)** — unlocks personalized experience
3. **Personalized Invitation + Query-Param Propagation (#2)** — the conversion surface
4. **State-Aware Waitlist Cross-Reference (#3)** — UX polish, low effort
5. **One-Click Claim from 404 (#4)** — highest conversion potential, higher complexity
6. **Post-Apply Preview (#5)** — retention and continuity, most complex
