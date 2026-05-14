---
date: 2026-05-14
topic: unified-responsive-layout-system
focus: desktop and mobile UI cohesion across marketing, store, crate, apply, and admin surfaces
mode: repo-grounded
---

# Ideation: Unified Responsive Layout System

## Grounding Context

Milkcrate is a Rails 8 app with an Inertia React frontend. The public app has a marketing homepage at `/`, an application form at `/apply`, store pages at `/:discogs_username`, a crate browsing view within the store page, and an admin waitlist page at `/admin`.

The product strategy is clear: Milkcrate should make online record browsing feel like walking into a record store, using spatial bins, walls, genre sections, and a digger's algorithm to surface interesting records. The active tracks are digital storefront character, the digger's algorithm, and store onboarding/freemium.

Current frontend structure already has pieces of a responsive system:

- `ViewportContext` defines `compact`, `comfy`, and `wide` tiers and exposes them through `useViewport`.
- `StorefrontMotionConfig`, `motion_tokens.ts`, `TactileCard`, and `use_tactile_hover` centralize tactile motion behavior.
- `StoreFloor`, `CrateView`, `PileSheet`, `FeaturedCratesRow`, and `GenreGrid` already morph pieces of the store experience by tier.
- `renderWithTier` gives tests a direct way to exercise compact/comfy/wide branches.

The drift is also concrete:

- `MarketingLayout` and `AppLayout` are separate React shells with duplicated header/theme concerns.
- `home.tsx` uses decorative crate thumbnails rather than the live store primitives.
- `apply.tsx` is a straightforward form inside `MarketingLayout`, disconnected from the tactile browsing language.
- `app/views/admin/waitlists/index.html.erb` is a standalone ERB page with inline CSS and no shared tokens, shell, or responsive component system.
- Storefront components still branch locally on viewport tier. Prior documented solutions already warn that responsive branching refactors can drop guard conditions and that cross-tier test coverage is required.

External grounding:

- Material's responsive layout guidance names a useful pattern set for this exact problem: reveal, transform, divide, reflow, expand, and position as screen space changes.
- Material also frames small screens as one hierarchy level at a time and larger screens as summary plus detail when space allows.
- Android's responsive navigation guidance recommends changing navigation elements by window size while preserving navigation principles, and specifically warns not to create different content destinations just to accommodate different sizes.

## Topic Axes

- Shared shell and navigation
- Morphing record and crate primitives
- Store and crate browsing flow
- Marketing and application surfaces
- Admin and operational surfaces
- Responsive governance and tests

## Ranked Ideas

### 1. Responsive Composition Contract

**Description:** Define one composition contract for Milkcrate screens: `Shell -> Surface -> Section -> Item -> Action`. Marketing, store, crate, apply, and admin pages would use the same shell vocabulary and slot structure, while each surface decides how to reveal, divide, or reflow its slots at compact/comfy/wide sizes. This turns "mobile vs desktop layout" into "same surface, different placement strategy."

**Axis:** Shared shell and navigation

**Basis:** `direct:` `MarketingLayout` and `AppLayout` both implement headers, theme toggles, constrained content, and skip links separately, while `/admin` has a third standalone HTML shell with inline CSS. `external:` Material's responsive patterns explicitly support transforming, dividing, reflowing, expanding, and repositioning UI as space changes.

**Rationale:** This attacks the mental barrier directly. Instead of maintaining separate page designs, each page owns the same semantic regions and chooses a placement policy. The codebase already has the provider/hook pattern from `ViewportContext`, so this extends an existing local architecture rather than inventing a parallel one.

**Downsides:** Medium initial design cost. This should start as a thin contract and migration path, not a giant layout framework.

**Confidence:** 90%

**Complexity:** Medium

**Status:** Unexplored

### 2. Container-Aware Crate And Record Primitives

**Description:** Promote crate and record presentation into composable primitives that respond to their container: `RecordTile`, `RecordStack`, `CrateShelf`, `CrateGrid`, and `CrateRail` should share data shape, action slots, artwork handling, and motion tokens. Viewport tier can still decide high-level topology, but each component should primarily adapt to available component space and intended density.

**Axis:** Morphing record and crate primitives

**Basis:** `direct:` `StoreFloor` hand-codes picks as a desktop grid and compact horizontal scroll, while `FeaturedCratesRow` and `GenreGrid` calculate columns separately. `RecordCard` is reused, but the browsing surfaces still duplicate presentation decisions around it. `external:` Material's responsive guidance includes component-level reflow based on screen ratio and available space.

**Rationale:** This is the core unification move. A record should feel like the same object whether it appears in the homepage preview, picks wall, genre grid, crate stack, pile, or admin review surface. Container-aware primitives reduce branching and make future surfaces cheaper.

**Downsides:** Requires careful API boundaries so the primitives do not become a vague "do everything" component. The first pass should cover only the current surfaces.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 3. One Store Destination That Divides On Desktop

**Description:** Treat the store floor, active crate, details, and pile as one responsive destination. On compact screens, keep the current tactile sequence: floor -> crate stack -> details/pile as sheets or card flips. On wide screens, divide the same state into persistent regions: store map or crate rail, active stack, details, and pile bench.

**Axis:** Store and crate browsing flow

**Basis:** `direct:` `Featured` already keeps `activeSlug` and `startIndex` in one page-level state and switches between `StoreFloor` and `CrateView`. `CrateView` already shows compact header/tabs on mobile and a two-column details panel on desktop. `external:` Android's responsive navigation guidance says responsive UIs should adapt a single destination and avoid navigation as a side effect of window-size changes.

**Rationale:** This preserves a cohesive experience while letting desktop earn its extra space. Mobile remains tactile and focused. Desktop becomes more spatial without becoming a separate product.

**Downsides:** Back/history behavior needs design attention, especially when resizing while inside a crate. Existing tests around `history.pushState` and `popstate` would need expansion.

**Confidence:** 86%

**Complexity:** High

**Status:** Unexplored

### 4. Mobile Tactile Dock, Desktop Side Bench

**Description:** Make core actions use a shared action-zone model. On mobile, pile, back, crate tabs, and browse controls live in thumb-reachable bottom/edge affordances with tactile press feedback. On desktop, the same actions become a persistent side bench, toolbar, or rail near the active content.

**Axis:** Store and crate browsing flow

**Basis:** `direct:` `PileSheet` already morphs from compact bottom sheet to desktop side drawer, and `CrateView` already changes navigation controls and details placement by tier. `external:` Android responsive navigation maps compact width to bottom navigation and wider displays to rail/drawer patterns.

**Rationale:** This gives each access method an authentic feel without splitting the product. Mobile can feel physical and thumb-driven; desktop can feel spatial and persistent.

**Downsides:** Easy to overdo. The contract should define action priority and placement rules so every page does not invent its own dock.

**Confidence:** 82%

**Complexity:** Medium

**Status:** Unexplored

### 5. Marketing As A Live Storefront Excerpt

**Description:** Replace the homepage's decorative crate thumbnails with the same adaptive crate/record primitives used by real store pages, fed by demo or curated props. The marketing page becomes a small live slice of Milkcrate: compact users can swipe a tactile shelf; desktop users see a richer wall/bench preview.

**Axis:** Marketing and application surfaces

**Basis:** `direct:` `home.tsx` currently has a local `CrateThumbnail` component whose comments describe it as decorative. The README and strategy both identify the live browsing experience as the product's core differentiator.

**Rationale:** Marketing and product stop drifting because the marketing page uses the product's real expressive primitives. This also turns visual polish work into product polish rather than one-off homepage code.

**Downsides:** Needs a stable demo data path so the homepage does not depend on a fragile live store state. Could start with static props shaped like real crate props.

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

### 6. Apply And Admin As Frontstage/Backstage Panels

**Description:** Reframe `/apply` and `/admin` as two ends of the same onboarding surface. The application form uses the shared responsive shell and tactile field primitives; the admin waitlist view uses the same tokens and responsive primitives, presenting applications as compact cards on mobile and a dense table/workbench on desktop.

**Axis:** Admin and operational surfaces

**Basis:** `direct:` `/apply` is an Inertia page in `MarketingLayout`, while `/admin` is standalone ERB with inline CSS. Both are about seller onboarding, but they share no layout or component language. The strategy track "Store onboarding & freemium model" makes this flow strategically important.

**Rationale:** This unifies a user-facing acquisition flow with the operator workflow that responds to it. It also removes the most obvious outlier surface from the design system.

**Downsides:** Moving admin into Inertia may be more work than applying shared CSS tokens to ERB. A staged migration should avoid turning this into an auth/admin rewrite.

**Confidence:** 80%

**Complexity:** Medium

**Status:** Unexplored

### 7. Responsive Governance Toolkit

**Description:** Add governance around responsive work: component-level tier tests, a compact/comfy/wide page smoke matrix, screenshots for the five target surfaces, and a lightweight lint/checklist that flags new ad-hoc viewport branching. Treat responsive parity as a system invariant, like the motion token system.

**Axis:** Responsive governance and tests

**Basis:** `direct:` `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` documents a real bug class from responsive branching. `viewport-test-utils.tsx` and existing `CrateView` tests show the repo already has the testing seam.

**Rationale:** Unification will not stick if regressions are only caught by visual memory. A governance layer makes "mobile and desktop are one cohesive experience" enforceable in CI and reviews.

**Downsides:** Testing can become noisy if it snapshots implementation details. Keep assertions focused on structure, accessibility, and major layout affordances.

**Confidence:** 87%

**Complexity:** Low

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Build separate mobile and desktop apps | Subject-replacement. It increases the exact maintenance split the prompt wants to reduce. |
| 2 | Make every page purely CSS-only responsive | Too rigid. The store flow has real interaction topology changes, not only styling changes. |
| 3 | Keep admin outside the system because it is internal | Not grounded in the stated scope; the prompt explicitly includes admin. |
| 4 | Redesign the whole brand before unifying layouts | Scope overrun. Brand polish may follow, but the maintenance barrier is structural. |
| 5 | Add more breakpoints beyond compact/comfy/wide | Duplicates weaker version of container-aware primitives; more viewport tiers would likely increase drift. |
| 6 | Turn the homepage into a long marketing landing page | Conflicts with Milkcrate's strategy. The product's core signal is browsing, not generic SaaS persuasion. |
| 7 | Use a component library off the shelf | Not grounded. The repo already has a domain-specific tactile/motion system that would be diluted by generic components. |
| 8 | Move everything into one mega `ResponsiveLayout` component | Too expensive relative to value and likely to become a vague abstraction. The better move is a small composition contract plus focused primitives. |
| 9 | Rebuild crate browsing as route-per-breakpoint | Rejected by external responsive guidance and likely to break history/state continuity. |
| 10 | Only polish the mobile crate view | Below scope. It helps one surface but does not unify marketing, store, apply, crate, and admin. |

## Suggested Next Step

Use `ce-brainstorm` on idea 1, "Responsive Composition Contract", and include idea 2 as a required companion. Those two define the architectural spine; the remaining ideas become migration slices once the contract is clear.

## Sources

- Codebase: `README.md`, `STRATEGY.md`, `app/frontend/layouts/app_layout.tsx`, `app/frontend/layouts/marketing_layout.tsx`, `app/frontend/pages/home.tsx`, `app/frontend/pages/apply.tsx`, `app/frontend/pages/stores/featured.tsx`, `app/frontend/components/store_floor.tsx`, `app/frontend/components/crate_view.tsx`, `app/frontend/components/pile_sheet.tsx`, `app/views/admin/waitlists/index.html.erb`
- Documented solutions: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`, `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`, `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
- External: Material Design, "Responsive UI" — https://m1.material.io/layout/responsive-ui.html
- External: Android Developers, "Build responsive navigation" — https://developer.android.com/develop/ui/views/layout/build-responsive-navigation
