---
title: "feat: Rebuild homepage as buyer-led storefront lobby"
type: feat
status: completed
date: 2026-05-23
origin_docs:
  - docs/ideation/2026-05-23-home-page-redesign-ideation.md
---

# feat: Rebuild homepage as buyer-led storefront lobby

## Summary

Rebuild the public homepage around one clear lobby experience: buyers should immediately understand that Milkcrate lets them browse a Discogs seller like they are in a record store, while sellers see that same buyer experience as the reason to request a storefront. The work stays on one mobile-first page, uses existing record/crate primitives, and keeps seller promises beta-safe until self-serve claiming and premium customization are truly ready.

---

## Problem Frame

The current homepage still reads seller-first: the headline is "Your Discogs inventory, now a storefront," the first CTA choice appears before product proof, and later sections use a generic feature-card rhythm. That blurs Milkcrate's strategic center: record buyers are the primary audience, and seller value comes from giving those buyers a warm storefront that Discogs inventory alone does not provide.

---

## Requirements

- R1. Lead with the buyer browsing promise, not an equal buyer/seller split and not a seller-only inventory headline.
- R2. Make product proof visible in the first viewport on mobile, using the visual language of records, crates, and a storefront lobby.
- R3. Keep sellers clearly routed from the homepage with beta-safe language around requesting or claiming a storefront.
- R4. Explain the marketplace loop: buyers browse crates, sellers get a shareable storefront, and Discogs remains the inventory and checkout system.
- R5. Replace generic SaaS-like cards and onboarding mechanics with product-native store moments.
- R6. Keep the page mobile-first and let larger layouts expand from the compact information hierarchy.
- R7. Preserve the current public routes: `/`, `/philadelphiamusic`, `/apply`, and store routes.
- R8. Preserve bounded homepage preview payload behavior and avoid shipping full store data to the marketing page.
- R9. Keep copy truthful: no instant self-serve setup, no shipped premium customization claims, no fake conversion metrics.
- R10. Keep the shared Milkcrate brand, shell, viewport, and motion systems intact.
- R11. Maintain rendering and accessibility coverage across compact, comfy, and wide viewport tiers.

---

## Scope Boundaries

- No separate seller page in this pass.
- No pricing table, plan comparison, payments, or entitlement logic.
- No self-serve Discogs OAuth claim flow or route changes.
- No new curation algorithm, store sync behavior, or Discogs API integration changes.
- No analytics dashboard, testimonials, or ungrounded conversion claims.
- No premium theme editor or customization UI.
- No broad redesign of store browsing pages, `CrateView`, `StoreFloor`, `/apply`, or admin.

### Deferred to Follow-Up Work

- Dedicated seller page: add when pricing, self-serve claim, paid acquisition, or seller education requires more depth than the homepage can carry.
- Premium customization marketing: add after the shipped customization surface and entitlement boundary are defined.
- QR or record-fair asset generation: plan separately if the Philamoca fair follow-up needs printable assets or vendor-specific codes.

---

## Context & Research

### Relevant Code and Patterns

- `app/frontend/pages/home.tsx` currently owns the homepage section structure, CTA routing, preview rendering, onboarding steps, store-character cards, record-fair callout, and final seller CTA.
- `config/locales/en.yml` is the source for homepage and apply copy. Current homepage strings include seller-first positioning and em dashes that conflict with design guidance.
- `app/controllers/pages_controller.rb` keeps the home action thin and passes `copy` plus `preview` props to Inertia.
- `app/presenters/marketing_preview_presenter.rb` bounds the preview payload with `MAX_PREVIEW_RECORDS`, `MAX_FEATURED_CRATES`, and `MAX_GENRE_CRATES`, then falls back to typed empty preview data when no demo store exists.
- `app/frontend/types/inertia.ts` defines `HomepagePreview`, `StorefrontSection`, `Crate`, and `Listing`, which should remain the shared contract unless implementation proves a small additive field is necessary.
- `app/frontend/components/crate_shelf.tsx` and `app/frontend/components/record_tile.tsx` are the current reusable crate/record display primitives. `StorefrontPreview` was removed from production code, so this plan should not depend on restoring that stale abstraction.
- `app/frontend/components/crate_view.tsx` is the full interactive record browser. The homepage can link into the demo store, but should not embed the full `CrateView` interaction model in the hero.
- Existing tests to update include `app/frontend/test/pages/home.test.tsx`, `app/frontend/test/pages/page_smoke.test.tsx`, `app/frontend/test/pages/responsive_surface_matrix.test.tsx`, and `spec/requests/pages_spec.rb`.

### Institutional Learnings

- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` establishes `MarketingLayout`, `MilkcrateShell`, `BrandMark`, bounded preview data, `RecordTile`, and `CrateShelf` as the public-surface vocabulary.
- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` establishes compact, comfy, and wide viewport tiers plus `renderWithTier` test coverage.
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` requires motion to use shared token/provider patterns and reduced-motion support rather than one-off animation values.
- `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` warns that responsive refactors can silently drop branch guards. Homepage changes should test populated and fallback preview states across tiers.
- `docs/DESIGN.md` rejects SaaS-generic hero patterns, identical card grids, excessive decorative accents, wrapped cards, and em dashes in UI copy.
- `docs/PRODUCT.md` and `STRATEGY.md` name record buyers as primary and store owners as secondary, with "record store browsing" as the product purpose.

### External References

External marketplace and competitor research is summarized in `docs/ideation/2026-05-23-home-page-redesign-ideation.md`. No additional external developer research is needed for this plan because the implementation should follow established local Rails, Inertia, React, viewport, and motion patterns.

---

## Key Technical Decisions

- Keep one homepage now: the clarity problem is audience hierarchy, not lack of routing. A seller page should wait until seller-specific funnel depth exists.
- Use buyer proof as seller proof: the strongest seller pitch is seeing what a buyer experiences, so the hero should show the storefront lobby before seller mechanics.
- Build the hero proof from existing preview primitives: `CrateShelf` and `RecordTile` are the maintained shared components; reviving `StorefrontPreview` would add abstraction churn for one page.
- Avoid embedding full `CrateView` in the hero: `CrateView` owns focused browsing, pile context, and rich interaction. The homepage should preview the doorway, then send users to the demo store for the full interaction.
- Keep Rails layering simple: `PagesController` stays thin, `MarketingPreviewPresenter` stays presentation-oriented, and curation logic remains in existing services.
- Treat fallback preview as a designed state: if local demo data is absent, the first viewport still needs a credible lobby shape and clear demo link, not a blank proof section.
- Let compact layout define the hierarchy: desktop can add density and side-by-side composition only after the mobile order works.

---

## Open Questions

### Resolved During Planning

- One page or multiple pages: keep one primary homepage in this pass, with a dedicated seller page deferred.
- Should the hero split buyer and seller equally: no. It should lead with buyer browsing and give sellers a clear secondary route.
- Should the page look like the product: yes. Use record/crate primitives, the shared shell, existing tokens, and product vocabulary instead of generic marketing cards.

### Deferred to Implementation

- Exact copy wording: implementation should tune the final lines in context, while preserving buyer-first hierarchy, beta-safe seller promises, and the no-em-dash rule.
- Exact hero composition across breakpoints: implementation should tune spacing and density after seeing the live layout, while preserving the compact-first order.
- Whether a small helper component is needed for the hero preview: decide while implementing. If `home.tsx` becomes dense or repeated, extract a focused component rather than a broad preview framework.

---

## High-Level Technical Design

> This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.

| Page moment | Primary job | Audience served | Notes |
| --- | --- | --- | --- |
| First viewport lobby | Prove "browse a Discogs seller like a record store" | Buyers first, sellers second | Buyer headline, demo CTA, seller secondary CTA or anchor, product-native mini-store proof |
| Marketplace loop | Explain why both sides care | Buyers and sellers | Buyers dig, stores get a shareable front room, Discogs handles transaction |
| Seller claim band | Convert interested sellers without overpromising | Sellers | Request/setup language, Discogs username path, early-access framing |
| Store character | Show what Milkcrate makes from inventory | Both | Crates, sections, pile, store mood, and premium tease as character rather than settings |
| Record-fair/final CTA | Ground a real acquisition context | Sellers | Keep as one callout, not the page's whole identity |

---

## Implementation Units

### U1. Reframe Homepage Copy Contract Around Buyer-Led Lobby

**Goal:** Replace seller-first homepage copy with a buyer-led content model that still gives sellers a clear path.

**Requirements:** R1, R3, R4, R9

**Dependencies:** None

**Files:**
- Modify: `config/locales/en.yml`
- Modify: `app/frontend/pages/home.tsx`
- Modify: `app/frontend/layouts/marketing_layout.tsx`
- Test: `app/frontend/test/pages/home.test.tsx`
- Test: `app/frontend/test/pages/page_smoke.test.tsx`
- Test: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`
- Test: `spec/requests/pages_spec.rb`

**Approach:**
- Replace the current seller-first headline and subhead with buyer browsing language.
- Preserve locale-driven copy rather than hard-coding new marketing text in React.
- Rename or reshape homepage copy groups as needed so the page model reflects lobby, marketplace loop, seller path, store character, and fair/final CTA sections.
- Re-label shared marketing header actions if current labels are too generic for the buyer/seller routing job, while preserving the existing routes.
- Keep `/apply` copy mostly outside this pass unless a shared CTA label requires a small consistency update.
- Remove em dashes from user-facing homepage strings.

**Execution note:** Start with failing copy/contract tests so the old seller-first headline cannot survive by accident.

**Patterns to follow:**
- Locale-driven `copy` prop from `app/controllers/pages_controller.rb`.
- Existing page smoke tests that assert homepage copy and route props.

**Test scenarios:**
- Happy path: GET `/` returns a buyer-led headline in `copy.headline`.
- Regression: homepage copy no longer includes "Your Discogs inventory, now a storefront."
- Regression: homepage copy values do not contain em dashes.
- Happy path: primary demo CTA and seller CTA both remain present with discernible labels.
- Integration: frontend tests render the updated copy object without TypeScript shape drift.

**Verification:**
- The first text a mobile visitor reads is about browsing records, not operating seller inventory.

### U2. Build The First-Viewport Storefront Lobby

**Goal:** Move product proof into the first viewport with a mobile-first mini-store composition that feels like Milkcrate, not a SaaS hero.

**Requirements:** R1, R2, R6, R8, R10, R11

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Create: `app/frontend/components/home_storefront_lobby.tsx`
- Test: `app/frontend/components/home_storefront_lobby.test.tsx`
- Test: `app/frontend/test/pages/home.test.tsx`
- Test: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

**Approach:**
- Compose the hero as a lobby: compact copy, immediate demo CTA, secondary seller route, and a bounded crate/record preview in the same first-screen story.
- Extract a focused homepage-only lobby component so the page file owns section order while the new component owns preview-state rendering.
- Prefer `CrateShelf` and `RecordTile` for preview visuals. Use `CrateView` only as the linked full demo destination, not as an embedded hero control.
- Keep the mini-store proof non-interactive or lightly linked to the demo store; do not introduce pile behavior, record flipping, or crate navigation into the homepage hero.
- Ensure compact view renders in a single deliberate order before adding wider side-by-side composition.
- Use existing motion tokens and `MarketingLayout` providers if animation is needed; avoid inline spring values.

**Patterns to follow:**
- Non-interactive `CrateShelf` behavior in `app/frontend/components/crate_shelf.tsx`.
- `RecordTile` lightweight cover rendering.
- `MarketingLayout` wrapping `StorefrontMotionConfig` and `ViewportProvider`.

**Test scenarios:**
- Happy path: when preview data includes a `picks_wall` crate with records, the first viewport renders a product-native crate/record proof.
- Happy path: demo CTA links to the preview store slug when present and `/philadelphiamusic` otherwise.
- Regression: homepage no longer imports or renders full `CrateView` for the marketing preview.
- Edge case: one-record preview data renders without layout crash or empty proof copy.
- Responsive: compact, comfy, and wide tiers render the hero without duplicate CTAs, missing heading, or preview crash.
- Accessibility: hero links have discernible names and the H1 remains the first page heading.

**Verification:**
- A mobile visitor can understand the buyer experience before scrolling past the hero.

### U3. Replace Onboarding Mechanics With Marketplace Loop And Seller Claim Path

**Goal:** Rework the middle of the page so buyer and seller value reinforce each other instead of competing.

**Requirements:** R3, R4, R6, R7, R9, R11

**Dependencies:** U1, U2

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Modify: `config/locales/en.yml`
- Test: `app/frontend/test/pages/home.test.tsx`
- Test: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

**Approach:**
- Replace the current numbered "Share your Discogs / We sync / Share your store" section with a marketplace-loop section that explains buyers, sellers, and Discogs in one flow.
- Add a seller claim/request band with beta-safe wording and a direct `/apply` route.
- Keep the record-fair callout, but make it a supporting acquisition moment rather than the page's main argument.
- Use full-width bands or unframed section layouts rather than nested card stacks.

**Patterns to follow:**
- Existing `Link` CTA patterns in `home.tsx`.
- Design guidance in `docs/DESIGN.md` for concise sections, flat surfaces, and no wrapped cards.

**Test scenarios:**
- Happy path: marketplace loop copy renders and references buyers, stores, and Discogs without false claims.
- Happy path: seller section includes a route to `/apply`.
- Regression: old onboarding step labels no longer appear.
- Regression: seller copy does not imply instant self-serve setup.
- Responsive: seller path appears after the buyer proof in compact tier and remains reachable without relying on desktop-only layout.

**Verification:**
- The page explains the two-sided value proposition without putting two unrelated pitches in the hero.

### U4. Rebuild Store Character As Product-Native Moments

**Goal:** Replace the current generic feature-card grid with moments that look and read like the Milkcrate product.

**Requirements:** R2, R5, R6, R9, R10, R11

**Dependencies:** U1, U2

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Modify: `config/locales/en.yml`
- Test: `app/frontend/test/pages/home.test.tsx`

**Approach:**
- Keep the ideas that matter: Milkcrate Picks, featured crates, genre bins, pile building, and future store character.
- Present them as product-native crate/store moments instead of identical feature cards.
- Tease premium customization as store character only if the copy makes clear it is future-facing or premium-directional.
- Use accent color for actions and section headers, not decorative fill.
- Avoid fake metrics, dashboards, AI generic positioning, and unsupported controls.

**Patterns to follow:**
- `CrateShelf` and `RecordTile` for record/crate visual vocabulary where visuals help.
- `docs/DESIGN.md` rules for the one accent, flat-by-default surfaces, and anti-SaaS layout.

**Test scenarios:**
- Happy path: store-character section renders product-native labels or moments for picks, crates, bins, and pile.
- Regression: old generic feature-card copy does not appear.
- Regression: no copy claims manual crate spotlighting, one-click Discogs cart transfer, or shipped customization controls.
- Regression: decorative emoji are not rendered on the page.
- Accessibility: section has a meaningful heading and does not rely on decorative-only glyphs to communicate meaning.

**Verification:**
- The section feels like a preview of Milkcrate storefront behavior, not a generic software feature list.

### U5. Harden Preview Fallbacks And Regression Coverage

**Goal:** Ensure the redesigned lobby remains stable when demo data is present, sparse, or absent.

**Requirements:** R2, R8, R10, R11

**Dependencies:** U2, U3, U4

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Modify: `app/frontend/components/home_storefront_lobby.tsx`
- Test: `app/frontend/components/home_storefront_lobby.test.tsx`
- Test: `app/frontend/test/pages/home.test.tsx`
- Test: `app/frontend/test/pages/page_smoke.test.tsx`
- Test: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`
- Test: `spec/presenters/marketing_preview_presenter_spec.rb`
- Test: `spec/requests/pages_spec.rb`

**Approach:**
- Preserve the existing bounded preview caps and avoid adding full-store payloads to the homepage.
- If no live preview records exist, render an intentional fallback lobby state with a strong demo link instead of a blank or misleading fake store.
- Keep fallback records out of the backend unless they are clearly non-sale placeholders and tests prove they cannot be mistaken for real Discogs listings.
- Leave `HomepagePreview` and `MarketingPreviewPresenter` shape unchanged unless implementation discovers the existing typed empty fallback cannot support the designed frontend state.
- Keep tests characterization-focused around current preview capping before changing presenter behavior.

**Patterns to follow:**
- `MarketingPreviewPresenter#fallback_preview` typed shape.
- Presenter specs that already cover empty demo store and no-demo-store cases.
- Responsive matrix tests that render home at all viewport tiers.

**Test scenarios:**
- Happy path: live preview data remains capped by records and crate counts.
- Edge case: empty demo store returns a stable preview shape and the homepage renders an intentional fallback state.
- Error path: presenter rescue still returns a safe fallback shape when demo store lookup or curation fails.
- Regression: homepage preview never requires full store sections to render the first viewport.
- Integration: request spec still proves `/` returns the `home` component with `copy` and `preview` props.

**Verification:**
- The redesigned homepage is credible with demo data and still usable in development or test environments without a synced demo store.

---

## System-Wide Impact

- **Interaction graph:** GET `/` flows through `PagesController#home`, `MarketingPreviewPresenter`, Inertia `Home`, `MarketingLayout`, and the shared viewport/motion providers. Demo and seller CTAs continue routing to store slug or `/apply`.
- **Error propagation:** Preview failures remain non-fatal and should fall back to a safe homepage state. Seller application behavior is unchanged.
- **State lifecycle risks:** Avoid adding pile state, crate selection state, or full `CrateView` state to the marketing page. The lobby should not persist browsing state or mutate local pile storage.
- **API surface parity:** `HomepagePreview` should stay backward-compatible unless implementation needs an additive field. Any contract change requires request, presenter, and frontend test updates.
- **Integration coverage:** Unit tests should cover copy, fallback states, and component rendering; request specs should cover Inertia props; responsive matrix should cover all viewport tiers.
- **Unchanged invariants:** Store routes, Discogs outbound links, curation scoring, inventory sync, OAuth onboarding, waitlist submission, and admin behavior remain unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| Hero preview becomes a second product surface with duplicated browsing behavior | Use `CrateShelf` and `RecordTile`; link to the demo store for full browsing. |
| Seller value gets buried by buyer-first hierarchy | Keep seller CTA in the hero and add a dedicated seller claim/request band below the marketplace loop. |
| Fallback state weakens product proof in environments without demo data | Design an intentional fallback lobby with a clear demo link and test it explicitly. |
| Copy overpromises self-serve claiming or premium customization | Keep beta-safe wording and add regression assertions against instant setup and shipped customization claims. |
| Responsive redesign introduces compact-only or wide-only regressions | Update `home.test.tsx` and `responsive_surface_matrix.test.tsx` for compact, comfy, and wide states. |
| Stale docs reference `StorefrontPreview` as if it still exists | Follow current production code and note that `StorefrontPreview` should not be restored unless a future broader preview abstraction is planned. |

---

## Documentation / Operational Notes

- Update `docs/DESIGN.md` only if the implementation establishes a reusable homepage/lobby pattern that should become design-system guidance. Do not update it just to describe this one page.
- The project instruction says the developer runs `bin/dev`; do not start or stop app servers during implementation. Use existing running server checks or ask the developer before browser verification.
- Visual verification should cover mobile first, then expanded desktop. In-app or browser testing should verify no overlapping text, no blank preview, and no hero copy/preview crowding.

---

## Sources & References

- Origin ideation: `docs/ideation/2026-05-23-home-page-redesign-ideation.md`
- Product strategy: `STRATEGY.md`
- Product context: `docs/PRODUCT.md`
- Design system: `docs/DESIGN.md`
- Prior marketing plan: `docs/plans/2026-05-14-002-refactor-marketing-truth-alignment-plan.md`
- Shared surface learning: `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- Viewport learning: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- Motion learning: `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- Homepage implementation: `app/frontend/pages/home.tsx`
- Marketing preview presenter: `app/presenters/marketing_preview_presenter.rb`
