---
date: 2026-06-01
issue: 216
topic: storefront-cohesion-audit
source: docs/plans/2026-06-01-001-feat-storefront-experience-language-issues-plan.md#u2
---

# Storefront Cohesion Audit

## Verdict

Milkcrate already has the right structural backbone for one connected shopper
session. Store identity lives in the shared storefront chrome, crate routing
preserves browser state, the active crate can return to the store floor, the
pile is persistent and store-scoped, and the Wantlist handoff has semantic
progress, success, and error states.

The main frontend confidence gap is not backend readiness. It is whether the
compact shopper can understand the loop as Store -> Wall -> Crate -> Record ->
Pile -> Discogs handoff without already knowing Milkcrate's internal model.
Today the code supports that loop, but the hierarchy and copy do not always
name the moments clearly enough.

Top gaps, in priority order:

1. The store floor still reads partly like a section menu. Wall, featured
   crates, and genre browsing need clearer jobs in the compact hierarchy.
2. Compact record inspection is hidden inside a card flip, while desktop gets
   an explicit detail panel. That makes the Record moment feel less durable on
   the source hierarchy.
3. Adding to the pile changes local button state and reveals the pile trigger,
   but there is no system-level confirmation that shopper intent has moved into
   a persistent layer.
4. Handoff copy is strongest inside the pile, but direct record links still read
   as generic external links. The design docs also still contain one stale
   Discogs cart reference.
5. Rare sync failure copy leaks implementation language into the shopper page.

## Scope

Reviewed surfaces:

- Store orientation and shell: `app/frontend/pages/stores/show.tsx`,
  `app/frontend/layouts/app_layout.tsx`, `app/frontend/layouts/milkcrate_shell.tsx`
- Wall and crate entry: `app/frontend/components/store_floor.tsx`,
  `app/frontend/components/crate_shelf.tsx`,
  `app/frontend/components/crate_section_grid.tsx`
- Crate browsing and record inspection:
  `app/frontend/components/crate_view.tsx`,
  `app/frontend/components/record_card.tsx`,
  `app/frontend/components/record_details.tsx`
- Pile review and Discogs handoff:
  `app/frontend/components/pile_sheet.tsx`,
  `app/frontend/components/pile_sheet/pile_footer.tsx`,
  `app/frontend/components/pile_sheet/wantlist_handoff.tsx`,
  `app/frontend/components/pile_sheet/wantlist_views.tsx`

Out of scope:

- Backend model, service, controller, OAuth, Wantlist, seller filter, and Discogs
  API renames.
- Any claim that Milkcrate provides checkout, reservation, or purchase
  completion.
- Broad visual redesign before the hierarchy issues are split into shippable
  frontend work.

## Review Inputs

- Product model: `docs/product.md:3` defines the unified session and the core
  nouns Store, Wall, Crate, Record, Pile, and Handoff.
- Design model: `docs/design.md:117` defines the same connected browsing
  session for storefront surfaces.
- Design-system pattern: `docs/design-system/patterns.md:57` names the
  storefront and pile composition boundary.
- Requirements: `docs/brainstorms/2026-05-31-storefront-experience-language-requirements.md:53`
  says transitions should preserve context and shopper intent.
- Implementation plan: `docs/plans/2026-06-01-001-feat-storefront-experience-language-issues-plan.md:120`
  scopes this audit to issue #216.
- Static detector: `npx impeccable --json` against the scoped storefront files
  returned `[]`.
- Web Interface Guidelines check: manually applied to the scoped files after
  fetching the current rules. Browser inspection was not run because project
  instructions say the agent must not start or stop the dev server.

## Transition Scorecard

Scale: 4 = connected and clear, 3 = mostly works with minor ambiguity, 2 =
functional but conceptually weak, 1 = likely to confuse shoppers, 0 = missing.

| Transition | Hierarchy | Continuity | Affordance | Copy | Responsive | A11y | Handoff clarity | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Store orientation -> Wall | 2 | 3 | 2 | 2 | 3 | 2 | n/a | The store summary appears before the floor, but the Wall is only implicit through the `picks_wall` section and crate name. |
| Wall -> Crate browsing | 3 | 3 | 2 | 2 | 3 | 2 | n/a | Selecting a shelf preserves record index, but compact entry depends on generic `Open` labels and hidden hover copy. |
| Crate browsing -> Record inspection, compact | 2 | 3 | 2 | 2 | 4 | 2 | 2 | The primary record interaction is immersive, but inspection and actions are behind the flippable card. |
| Crate browsing -> Record inspection, larger | 4 | 4 | 3 | 3 | 4 | 3 | 3 | Larger layouts reveal a parallel detail panel beside the active record. |
| Record inspection -> Add to pile | 3 | 3 | 3 | 3 | 3 | 3 | n/a | The button state changes to `In pile`; the global pile trigger appears only after intent exists. |
| Pile trigger -> Pile review | 4 | 4 | 4 | 4 | 4 | 4 | 3 | This is the strongest transition: modal semantics, inert background, focus return, and responsive drawer behavior are covered. |
| Pile review -> Discogs handoff | 3 | 3 | 3 | 3 | 4 | 4 | 3 | Wantlist states are clear, but the language still switches between records and releases. |
| Direct record -> Discogs | 2 | 2 | 2 | 2 | 3 | 3 | 2 | Direct `Discogs` links bypass the pile story and do not explain whether this is inspection, shopping, or handoff. |

## What Works

### One Session Backbone

`AppLayout` owns storefront providers, shopper state, pile state, motion config,
and viewport policy in one shell (`app/frontend/layouts/app_layout.tsx:217`).
The pile is scoped by store slug through `PileProvider`
(`app/frontend/layouts/app_layout.tsx:224` and
`app/frontend/hooks/use_pile.ts:6`), so shopper intent follows the store rather
than becoming a global cart.

`MilkcrateShell` provides a skip link, header region, one main landmark, and
footer composition (`app/frontend/layouts/milkcrate_shell.tsx:39` and
`app/frontend/layouts/milkcrate_shell.tsx:51`). That gives the storefront a
stable accessibility frame.

### Crate Routing Preserves Context

Entering a crate records `crateSlug` and `startIndex` in browser history
(`app/frontend/hooks/use_crate_routing.ts:63`). Returning to the store clears
crate state without leaving the app (`app/frontend/hooks/use_crate_routing.ts:81`).
Existing tests cover preserving state, replacing rapid second selections, and
direct crate-link return (`app/frontend/hooks/use_crate_routing.test.ts:21`,
`app/frontend/hooks/use_crate_routing.test.ts:37`, and
`app/frontend/hooks/use_crate_routing.test.ts:53`).

### Pile Review Is Treated As A Real Layer

The pile trigger is intentionally absent until intent exists
(`app/frontend/layouts/app_layout.tsx:105`), which keeps empty and early
browsing states from becoming cart-like. Once opened, the sheet has dialog
semantics, an inert background, focus trapping, safe-area behavior on compact,
and side-panel behavior on wide screens (`app/frontend/components/pile_sheet.tsx:82`,
`app/frontend/components/pile_sheet.tsx:90`, and
`app/frontend/components/pile_sheet.tsx:91`).

Tests cover the important mechanics: named trigger only after intent,
background inertness, focus return, compact full-screen behavior, wide
side-panel behavior, and Wantlist progress/result/error semantics
(`app/frontend/layouts/app_layout.test.tsx:129`,
`app/frontend/layouts/app_layout.test.tsx:137`,
`app/frontend/layouts/app_layout.test.tsx:158`,
`app/frontend/components/pile_sheet.test.tsx:398`,
`app/frontend/components/pile_sheet.test.tsx:416`, and
`app/frontend/components/pile_sheet.test.tsx:483`).

### Larger Layouts Adapt Outward

`CrateView` uses the same crate state model on compact and larger screens, then
adds a parallel detail/score panel at `md` and wider
(`app/frontend/components/crate_view.tsx:100` and
`app/frontend/components/crate_view.tsx:124`). Store-floor preview density also
adapts outward by showing more picks on larger screens
(`app/frontend/components/store_floor.tsx:70`). This matches the product rule
that desktop reveals context rather than inventing a second product.

## Priority Findings

### P1: Store Floor Needs Explicit Wall And Crate Jobs

Evidence:

- The product model says Wall is a distinct Milkcrate Picks surface
  (`docs/product.md:12`).
- `StoreFloor` recognizes `picks_wall`, `featured_crates`, and `genre_grid`,
  but it mostly delegates them as rendered sections
  (`app/frontend/components/store_floor.tsx:75`).
- `FeaturedCratesRow` labels its section only `Featured`
  (`app/frontend/components/featured_crates_row.tsx:12`).
- `GenreGrid` labels its section `Browse by genre`
  (`app/frontend/components/genre_grid.tsx:12`).
- `CrateSectionGrid` renders section title and count, but no role/job copy
  beyond the title (`app/frontend/components/crate_section_grid.tsx:43`).

Why it matters:

The compact store floor is the source hierarchy. If the first screen reads as
Picks, Featured, and Browse by genre without naming which part is the Wall and
which parts are crate entry choices, the shopper sees a menu of surfaces rather
than a store they are moving through.

Recommended follow-up issue:

**Define compact store-floor hierarchy and labels.** Update store-floor copy,
section headings, and accessible labels so Wall, featured crates, and genre
crates each have one clear job. Start with `store_floor.tsx`,
`crate_shelf.tsx`, `crate_section_grid.tsx`, `featured_crates_row.tsx`, and
`genre_grid.tsx`. Add responsive tests that assert the compact order and labels
at `compact`, then smoke the same nouns at larger tiers.

### P1: Compact Record Inspection Is Too Hidden

Evidence:

- Desktop gets an explicit record detail panel beside the active card
  (`app/frontend/components/crate_view.tsx:124`).
- Compact only gets the card stack and progress controls; record actions live on
  the back face of `RecordCard` (`app/frontend/components/record_card.tsx:57`).
- The flippable `RecordCard` is a `div` with `role="button"` and nested action
  controls inside the card (`app/frontend/components/record_card.tsx:130` and
  `app/frontend/components/record_card.tsx:189`).

Why it matters:

The card stack is the immersive core, but Record is supposed to be a distinct
inspection moment. On compact, inspection currently depends on discovering a
flip interaction. That makes pile and Discogs actions feel attached to a hidden
card back instead of to a durable record-inspection state.

Recommended follow-up issue:

**Make compact record inspection explicit without weakening the crate.** Add a
compact inspection affordance and semantic structure that keeps the crate stack
primary while giving the active record a named details/action state. Avoid a
backend or data-model rename. Add keyboard and screen-reader tests around flip,
details, pile action, and external link access.

### P1: Add-To-Pile Needs System-Level Confirmation

Evidence:

- `RecordCard` changes action copy from `+ Pile` to `In pile`
  (`app/frontend/components/record_card.tsx:58`).
- `RecordDetails` has the same local action on larger screens
  (`app/frontend/components/record_details.tsx:53`).
- The global pile trigger appears only when `pile.length > 0`
  (`app/frontend/layouts/app_layout.tsx:105`).
- Current tests cover the header trigger separately from record-card pile
  interaction (`app/frontend/layouts/app_layout.test.tsx:129` and
  `app/frontend/components/record_card.test.tsx:126`).

Why it matters:

The pile is a persistent shopper-intent layer. After adding a record, the
shopper should understand that intent was saved and know where it lives. The
current local button state is useful, but the transition from record to pile is
not announced as a system event.

Recommended follow-up issue:

**Close the record-to-pile feedback loop.** Add a compact-friendly confirmation
or live status when a record enters the pile, and test the real path from
record action to header pile trigger to pile sheet. Keep the trigger hidden for
empty piles.

### P2: Handoff Copy Is Strong In The Pile But Weak On Direct Record Links

Evidence:

- Pile copy explains the store-scoped action: `Get these records from
  {storeName} on Discogs` (`app/frontend/components/pile_sheet/wantlist_handoff.tsx:25`).
- Disconnected copy explains connecting to Discogs to send releases to Wantlist
  and shop from the store (`app/frontend/components/pile_sheet/wantlist_handoff.tsx:58`).
- Success copy points the shopper to shop from the store on Discogs
  (`app/frontend/components/pile_sheet/wantlist_views.tsx:27`).
- Direct record actions are still generic `Discogs` links
  (`app/frontend/components/record_card.tsx:67` and
  `app/frontend/components/record_details.tsx:58`).
- `docs/design.md:240` still mentions a disabled `Add all to Discogs cart`
  button, while tests assert the old cart button is absent
  (`app/frontend/components/pile_sheet.test.tsx:574`).

Why it matters:

The pile handoff correctly avoids checkout claims, but direct record links can
still feel like unframed exits from Milkcrate. The design-doc cart reference is
also stale and can mislead future work.

Recommended follow-up issue:

**Align all Discogs exit copy around handoff.** Rename direct record link copy
or labels so they explain the external listing handoff, keep Wantlist copy
precise in the pile, and remove stale cart language from the design docs. Add
tests that reject cart/register copy on shopper-facing storefront surfaces.

### P2: Storefront Error Copy Leaks Developer Operations

Evidence:

- The shopper-facing store page renders sync failure feedback when store sync
  fails (`app/frontend/pages/stores/show.tsx:48`).
- The recovery copy says `Try running the sync again from the Rails console`
  (`app/frontend/pages/stores/show.tsx:56`).

Why it matters:

This is rare-state copy, but it breaks the record-store frame immediately. It
also exposes implementation language to shoppers. The backend failure can stay
exactly as-is; only the shopper-facing explanation needs a product-safe state.

Recommended follow-up issue:

**Rewrite shopper-facing sync failure copy.** Keep semantic danger feedback, but
replace developer operations language with store-safe copy and route owner
instructions to the admin/dashboard surface if needed.

### P2: Store-Floor Entry Semantics Should Use Native Buttons

Evidence:

- `CrateShelf` renders the interactive shelf header as a `div` with
  `role="button"` and keyboard handlers (`app/frontend/components/crate_shelf.tsx:248`).
- Record thumbnails inside the same shelf are native `button` elements
  (`app/frontend/components/crate_shelf.tsx:117`).

Why it matters:

The current implementation has keyboard handlers, so this is not a missing
keyboard path. The issue is semantic consistency and click target clarity. Wall
and crate entry are primary actions; native buttons would better match platform
behavior and the Web Interface Guidelines.

Recommended follow-up issue:

**Convert primary shelf entry to native button semantics.** Preserve thumbnail
entry by record index, avoid nested button structures, and keep current focus
ring tests. This can ship with the store-floor hierarchy work if the same files
are already touched.

## Test Confidence

Good coverage already exists for:

- Crate routing and direct crate-link return:
  `app/frontend/hooks/use_crate_routing.test.ts:21`
- Compact crate context, tabs, progress, riffle controls, and edge states:
  `app/frontend/components/crate_view.test.tsx:79`
- Record card flip, pile action, Discogs link, and aria state:
  `app/frontend/components/record_card.test.tsx:68`
- Pile dialog mechanics, focus trapping, responsive layout, and Wantlist states:
  `app/frontend/components/pile_sheet.test.tsx:93`
- App-layout pile trigger, inert background, and focus return:
  `app/frontend/layouts/app_layout.test.tsx:129`

Coverage gaps to add with the follow-ups:

- Full compact journey test: store floor -> Wall -> crate -> record inspection
  -> add to pile -> open pile -> keep browsing.
- Copy guard test for shopper-facing forbidden nouns: no cart, checkout,
  register, or Rails-console copy in the storefront loop.
- Direct Discogs handoff label test for record card and desktop details.
- Store-floor hierarchy test that asserts Wall, featured crate entry, and genre
  crate entry have explicit jobs at compact and remain present at larger tiers.

## Recommended Issue Order

1. **Compact store-floor hierarchy and labels.** Highest leverage because it
   defines the source sequence for issue #217 and keeps the store floor from
   feeling like a generic menu.
2. **Compact record inspection affordance.** Makes Record a visible moment
   without changing backend behavior.
3. **Record-to-pile feedback loop.** Turns local action state into clear
   persistent shopper intent.
4. **Discogs handoff copy alignment.** Clarifies external exits and removes the
   stale cart reference.
5. **Rare-state storefront error copy.** Small but important product-language
   cleanup.

Issue #217 is still in the right place after this audit. The next hierarchy doc
should focus on compact ordering and mode ownership first, then define how
larger layouts reveal context and parallel inspection from that same state
model.
