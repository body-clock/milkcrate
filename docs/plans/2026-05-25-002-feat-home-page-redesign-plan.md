---
title: "feat: Home page redesign — shopper-first marketing page with self-serve OAuth"
type: feat
status: completed
date: 2026-05-25
origin: docs/brainstorms/2026-05-25-home-page-redesign-requirements.md
---

# feat: Home Page Redesign — Shopper-First Marketing Page with Self-Serve OAuth

## Summary

Redesign the Milkcrate home page as a shopper-first landing page: lead with a store browsing preview, reframe the hero to contrast with Discogs' search-grid weakness, replace the waitlist CTA with a self-serve Discogs OAuth input and seller preview flow, update the "how it works" steps to reference OAuth, and remove the record fair callout and old final CTA section. Mobile-first responsive, accessible by design.

---

## Problem Frame

The current home page serves one audience (store owners) with one message ("your Discogs inventory, now a storefront"), but Milkcrate has two distinct audiences. Store browsers (shoppers) land on the page and see nothing inviting them to browse — the hero sells them on a product they don't need. Store owners find a multi-field application form that routes them through a waitlist, when self-serve OAuth infrastructure already exists. The page needs to serve both audiences without confusing either, lead with the experience (shoppers browse immediately, sellers see proof before the CTA), and work beautifully on mobile.

---

## Requirements

- R1. Shopper-first page hierarchy: shopper hero → storefront preview → character cards → seller OAuth section → updated how it works → lean bottom
- R2. No "Get your store on Milkcrate" button in the hero or as primary CTA anywhere
- R3. Hero copy contrasts with Discogs browsing weakness (direction: "Browse Discogs like a record store, not an inventory")
- R4. "See the demo →" button stays in the hero, links to demo store
- R5. Storefront crate preview (existing `MarketingPreviewPresenter` data) elevated to second section, immediately below hero
- R6. Seller OAuth section with Discogs username input, async seller lookup, preview card (name + avatar + "Claim with Discogs" button)
- R7. Error states for not-found sellers, already-active stores, and existing applicants — each with waitlist fallback link to `/apply`
- R8. "Claim with Discogs" reuses existing `/:slug/authorize` route and `AuthorizeStoreService` (including 500-listing minimum gate)
- R9. How-it-works step 1 updated to reference OAuth ("Connect with Discogs"); steps 2-3 refreshed for copy alignment
- R10. Record fair callout section removed
- R11. Old final CTA section ("We're onboarding one at a time...") removed, replaced with lean bottom section
- R12. No new Turnstile on the home page — bot protection via Discogs API lookup rate limiting + OAuth human authorization
- R13. Mobile-first responsive design — all sections render correctly at compact (≤767px), comfy (768-1023px), and wide (≥1024px) viewports
- R14. Accessibility as a core tenet — proper labels, aria states, focus management, keyboard interaction, screen reader announcements, color contrast, touch target sizing

**Origin actors:** A1 (Shopper), A2 (Discogs seller), A3 (Discogs API)
**Origin flows:** F1 (Shopper browses demo store), F2 (Seller self-serve OAuth onboarding), F3 (Seller waitlist fallback)
**Origin acceptance examples:** AE1–AE6

---

## Scope Boundaries

- No changes to the `/apply` page itself (stays as-is with Turnstile, multi-field form, waitlist submission)
- No changes to the admin dashboard, admin onboarding flow, or applicant review workflow
- No changes to the OAuth callback handler (`AuthCallbackService`), store creation logic, or sync infrastructure
- No changes to the invitation page (unclaimed slug experience at `/{slug}`)
- No store directory or discovery surface product — the page remains a marketing page
- No new models, database tables, or API endpoints beyond extending a response field
- No new Turnstile or CAPTCHA on the home page
- No changes to `MarketingPreviewPresenter` or the crate preview data infrastructure

### Deferred to Follow-Up Work

- Record fair landing page separate from the home page — current content removed, future standalone page not scoped here

---

## Context & Research

### Relevant Code and Patterns

| Pattern | Location | How to use |
|---------|----------|------------|
| Discogs async probe (loading/found/not_found) | `app/frontend/pages/stores/invitation.tsx` | Mirror the `useEffect` + `AbortController` + `fetch` pattern for the username input |
| OAuth form POST pattern | `app/frontend/components/discogs_connection_controls.tsx` | CSRF token + form POST to existing route |
| Seller preview card | `app/frontend/pages/stores/invitation.tsx` (found state) | Name + avatar + CTA button layout |
| Crate preview section | `app/frontend/pages/home.tsx` (storefront preview) | Move up, keep component + data infra unchanged |
| Motion design tokens | `app/frontend/lib/motion_tokens.ts` | Use `springTactile` etc. instead of inline spring values |
| Responsive test utility | `app/frontend/test/pages/home.test.tsx` + `renderWithTier` | Test at compact/comfy/wide viewport tiers |
| Emoji regression tests | `app/frontend/test/pages/page_smoke.test.tsx` | Add new surface to the regression matrix |
| Locales structure | `config/locales/en.yml` under `en.pages.home.*` | All copy passes through I18n to `copy` props |
| Discogs seller lookup | `app/services/discogs_seller_lookup.rb` | Cached, rate-limited, returns `{ found, seller_name, avatar_url }` |
| Discogs lookup controller | `app/controllers/api/discogs_lookup_controller.rb` | GET `/api/discogs/lookup/:username` |
| OAuth initiation route | `POST /:slug/authorize` in `StoresController#authorize` | Handles validation + starts OAuth dance |
| Framer Motion section pattern | `app/frontend/pages/home.tsx` | `fadeUp`/`fadeIn` variants, `border-t` separators, `py-10 sm:py-16` padding |

### Institutional Learnings

- **Responsive branching guard drift** (`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`): When splitting render paths by viewport, audit every guard condition on every branch. Use `renderWithTier` tests to catch drift.
- **Boolean inversion trap** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): When switching from `isDesktop ? X : Y` to `isCompact ? Y : X`, audit every ternary — not just imports.
- **Touch hover flash** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): Gate hover effects on `pointerType !== "mouse"` to prevent one-frame flash on scroll.
- **Nested button hydration** (`docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`): Clickable wrappers around interactive children must use `role="button"` on `<div>`, never `<button>` or `motion.button`.
- **Conditional hook violations** (`docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`): Always call hooks unconditionally; wrap with `ViewportProvider`.
- **MarketingPreviewPresenter caps** (`docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`): `MAX_PREVIEW_RECORDS = 4`, `MAX_FEATURED_CRATES = 2`, `MAX_GENRE_CRATES = 2`.

### External References

- No external research needed — the codebase has solid patterns for every part of this work (Discogs probes, OAuth forms, Inertia page sections, responsive design).

---

## Key Technical Decisions

- **Extend existing lookup endpoint over new endpoint:** Add `store_status` to the `/api/discogs/lookup/:username` response instead of creating a new route. Minimizes surface area and keeps the home page lookup consistent with the invitation page.
- **Inline input over separate page:** The Discogs username input + preview lives on the home page itself rather than a dedicated `/onboard` page, minimizing friction.
- **Reuse invitation page probe pattern:** The `useEffect` + `fetch` + `AbortController` pattern from `invitation.tsx` is proven and handles loading/abort/timeout correctly.
- **No new component library:** Build into `home.tsx` with extracted helper components if complexity warrants — the page already has inline motion variants and section components.
- **Mobile-first with Tailwind responsive classes:** Prefer responsive utility classes (`sm:`, `lg:`) over JS branching for layout changes. Reserve JS branching only for behavior changes (focus management, screen reader announcements).

---

## Open Questions

### Deferred to Implementation

- [Affects R3] Exact hero copy and subhead — directional copy: "Browse Discogs like a record store, not an inventory." Refine during implementation.
- [Affects R6, R7] Exact copy for input label, submit button, preview card header, and error messages — reasonable defaults in plan; refine during implementation.
- [Affects R9] Updated copy for how-it-works steps 2 and 3 — step 1 is "Connect with Discogs"; steps 2-3 can be refreshed to match.
- [Affects R11] Exact content of lean bottom section — a short sign-off with a subtle link back to the seller section or `/apply`.
- [Affects R3] Treatment of old `footnote` and `cta_apply` I18n keys (`footnote` likely removed or relocated to seller section; `cta_apply` removed).
- [Affects R6, R7] `store_status` field name and possible values in the lookup API response — `"none" | "active_store" | "active_applicant"` or similar.

---

## Implementation Units

### U1. Backend: Update locales and extend Discogs lookup API

**Goal:** Add new I18n keys for the redesigned home page sections, remove stale keys, and extend the Discogs lookup API to return store/waitlist status so the frontend can show contextual messaging before the OAuth step.

**Requirements:** R1, R2, R3, R4, R7, R9, R10, R11, R13

**Dependencies:** None

**Files:**
- Modify: `config/locales/en.yml`
- Modify: `app/controllers/api/discogs_lookup_controller.rb`
- Modify: `app/services/discogs_seller_lookup.rb` (or create a new method)
- Create: `app/frontend/types/inertia.ts` (add `DiscogsLookupResult` type — or extend existing type)
- Modify: `app/controllers/pages_controller.rb` (if new props are needed)

**Approach:**
1. **Update locales** (`config/locales/en.yml`):
   - Under `en.pages.home`:
     - Replace `cta_apply` copy — this key is still used as a prop name but the value becomes the shopper hero copy (or add a new `hero_cta` key and remove `cta_apply`; keep backward compat by checking which keys the component destructures)
     - Replace `headline` with shopper-focused copy: "Browse Discogs like a record store, not an inventory" (refine wording during implementation)
     - Remove or relocate `footnote` ("Early access. We handle the setup.") — relocate to seller section
     - Remove `record_fair_title` and `record_fair_body`
     - Update `steps.step1_title` → "Connect with Discogs" (was "Share your Discogs")
     - Update `steps.step1_body` → reference OAuth: "Authorize with Discogs to claim your storefront and sync your full inventory."
     - Update `steps.step2_title` and `step2_body`, `step3_title` and `step3_body` for copy alignment
     - Add new keys for the seller OAuth section: `seller_section_title`, `seller_input_label`, `seller_input_placeholder`, `seller_submit`, `seller_preview_claim`, `seller_not_found`, `seller_already_active`, `seller_applicant_exists`, `seller_waitlist_fallback`, `seller_min_listings`
     - Add new key for lean bottom section: `bottom_signoff`
     - Add `hero_subhead` for the shopper hero sub-text
     - Keep `cta_demo` as-is (still "See the demo →")
     - Keep `preview_label` as-is (still "Flip Through Milkcrate Picks")
     - Keep `store_character_title` as-is
     - Keep `steps` step layout (3 steps, same visual component)

2. **Extend Discogs lookup response**:
   - In `DiscogsSellerLookup` (or a new wrapper method), after the Discogs API probe succeeds (`found: true`), check the local database:
     - If `Store.with_discogs_username(username).exists?` → `store_status: "active_store"`
     - If `Waitlist.with_discogs_username(username).exists?` → `store_status: "active_applicant"`
     - Otherwise → `store_status: "none"`
   - Add `store_status` and `store_storefront_path` (for active stores) and `slug` to the lookup response hash.
   - Update the controller (`Api::DiscogsLookupController#show`) to include these fields in the JSON response.

3. **API response shape:**
   ```jsonc
   {
     "found": true,
     "seller_name": "Philadelphia Music",
     "avatar_url": "https://...",
     "store_status": "none" | "active_store" | "active_applicant",
     "slug": "philadelphiamusic",
     "store_storefront_path": "/philadelphiamusic"  // only when active_store
   }
   ```

4. **Update `Typescript types`** — add a `DiscogsLookupResult` type (or union type for the response shape).

**Patterns to follow:**
- Existing `DiscogsSellerLookup` return shape (`{ found, seller_name, avatar_url, reason }`)
- Existing locale structure under `en.pages.home.*`

**Test scenarios:**
- Happy path: lookup finds valid seller with no existing store or waitlist → `store_status: "none"`
- Edge: lookup finds valid seller with existing active store → `store_status: "active_store"` with `store_storefront_path`
- Edge: lookup finds valid seller with existing waitlist applicant → `store_status: "active_applicant"`
- Edge: lookup fails (Discogs API error, invalid username) → existing behavior unchanged
- Locale keys: new keys resolve correctly in the `t("pages.home").to_h` hash

**Verification:**
- API returns the expected response shape for all `store_status` values
- I18n keys resolve without missing-translation errors
- Old removed keys (`record_fair_title`, etc.) no longer cause errors when absent

---

### U2. Frontend: Build DiscogsSellerLookupInput component

**Goal:** Create a self-contained React component for the Discogs username input with async seller lookup, loading state, seller preview card, error states, and OAuth redirect — mobile-first, accessible, and reusable.

**Requirements:** R6, R7, R8, R12, R13, R14

**Dependencies:** U1 (locales, API response shape)

**Files:**
- Create: `app/frontend/components/discogs_seller_lookup_input.tsx`
- Create: `app/frontend/components/discogs_seller_lookup_input.test.tsx`
- Modify (for types): `app/frontend/types/inertia.ts` (if `DiscogsLookupResult` type was added in U1)

**Approach:**
1. **Component structure** — a controlled component with these states:
   - `idle` — shows username input + submit button
   - `loading` — input disabled, show spinner, aria-busy
   - `preview` — seller preview card with name + avatar + "Claim with Discogs" button
   - `error_not_found` — "We couldn't find this username on Discogs" + waitlist fallback link
   - `error_active_store` — "This store is already on Milkcrate" + link to storefront
   - `error_applicant` — "This seller has already applied" + link to application status
   - `error_min_listings` — "Milkcrate requires at least 500 listings to create a storefront" + waitlist fallback
   - `error_api` — "Something went wrong. Try again." + retry button

2. **Flow:**
   - User types Discogs username → submit
   - POST to `/api/discogs/lookup/${encodeURIComponent(username)}`
   - On response, set state based on `found` + `store_status` fields
   - On "Claim with Discogs" click → render a hidden form POST to `/:slug/authorize` with CSRF token, or navigate programmatically

3. **Mobile-first layout:**
   - Compact (≤767px): Input is full-width, stacked. Preview card is full-width with avatar and button stacked below info.
   - Comfy (768-1023px) and wide (≥1024px): Input is narrower (max-w-sm), preview card is horizontal (avatar left, info center, button right).

4. **Accessibility:**
   - `<label>` connected to input via `htmlFor`
   - `aria-busy="true"` on submit button during loading
   - `aria-live="polite"` region for status announcements (preview loaded, error shown)
   - Focus management: after preview/error renders, move focus to the result container
   - Submit button: `aria-disabled` during loading
   - `role="alert"` on error messages
   - Touch targets minimum 44x44px
   - Color contrast: all states meet WCAG AA

5. **CSRF handling:** Read `csrf-token` from `<meta>` tag (same pattern as `discogs_connection_controls.tsx`).

6. **OAuth redirect:** The "Claim with Discogs" button submits a hidden form (POST to `/:slug/authorize`), identical to the invitation page's pattern. Use a `useRef` + form submit rather than `router.visit` to ensure CSRF token and method are correct.

7. **Rate limiting / caching:** The `DiscogsSellerLookup` service already caches results (1h TTL for found, 24h for not-found). No client-side caching needed.

**Patterns to follow:**
- Invitation page probe (`invitation.tsx`): `useEffect` + `AbortController` + CSRF form for OAuth
- OAuth form pattern (`discogs_connection_controls.tsx`): CSRF meta tag + hidden form POST
- Framer Motion tokens (`lib/motion_tokens.ts`): use `springTactile` for preview card entry animation

**Test scenarios:**
- Happy path: user enters valid username → loading state → preview card with "Claim with Discogs" button
- Edge: user enters non-existent username → error_not_found state with waitlist link
- Edge: user enters username with active store → error_active_store state with storefront link
- Edge: user enters username with applicant → error_applicant state
- Edge: user submits empty input → show validation inline (no API call)
- Edge: API returns error → error_api state with retry
- Edge: user submits while already loading → ignore subsequent submits
- Accessibility: aria-live region announces state transitions
- Accessibility: focus moves to result container on state change
- Responsive: renders correctly at compact/comfy/wide viewports
- Edge: AbortController cleanup on unmount (no state update after unmount)

**Verification:**
- Component renders in all states (idle, loading, preview, errors)
- "Claim with Discogs" triggers POST to `/:slug/authorize`
- Keyboard-only navigation works through the entire flow
- Screen reader announces loading, results, and errors
- Touch targets meet 44x44px minimum

---

### U3. Frontend: Redesign home page layout

**Goal:** Reorder the home page sections, update the hero, add the seller OAuth section, update the how-it-works section, remove the record fair and old final CTA sections, and add the lean bottom section — all within the existing `home.tsx` component structure.

**Requirements:** R1, R2, R3, R4, R5, R9, R10, R11, R13, R14

**Dependencies:** U1 (locales loaded), U2 (DiscogsSellerLookupInput component available)

**Files:**
- Modify: `app/frontend/pages/home.tsx` (major reorder + sections)
- Modify: `app/frontend/pages/home.test.tsx` (see U4)

**Approach:**
1. **Page structure (new order, top to bottom):**
   ```
   MarketingLayout
   └── Shopper Hero section (new copy, "See the demo →" button, no "Get your store" CTA)
   ├── Storefront Preview section (moved up from below character cards)
   ├── Store Character section (4 feature cards — unchanged)
   ├── Seller OAuth section (heading + DiscogsSellerLookupInput component + waitlist fallback link)
   ├── How It Works section (3 steps, step 1 updated to "Connect with Discogs")
   └── Lean Bottom section (short sign-off text)
   ```

2. **New shopper hero:**
   - Headline: uses new `headline` locale key (shopper-focused)
   - New `hero_subhead` paragraph below headline
   - "See the demo →" button only (no secondary button)
   - Remove `footnote` from hero (relocate to seller OAuth section)
   - Same motion animation pattern (fadeUp variants)

3. **Storefront preview elevation:**
   - The existing `<motion.section>` for the storefront preview (currently after hero, before character section) stays in roughly the same position but becomes the second section. Currently it's already the second section in the component — confirm in the existing `home.tsx` that the order matches and only the hero copy needs to change.

   Actually, looking at the existing `home.tsx` structure again:
   1. Hero (vendor-first)
   2. Storefront Preview (crate view)
   3. Store Character (4 cards)
   4. Onboarding Steps
   5. Record Fair Callout
   6. Final CTA

   The store preview is already the second section. The hero content changes (shopper-focused), the record fair and final CTA sections are removed, and the onboarding steps section gets updated copy. The seller OAuth section is added between character cards and how-it-works. The component structure is:
   - Hero → shopper-focused, replace secondary CTA with inline form... 

   Actually, wait — the seller OAuth inline form should be its own separate section, not in the hero. The hero has only the "See the demo →" button and the shopper copy. The OAuth input section comes below the character cards.

   So the new order is:
   1. Shopper Hero (new copy, "See the demo →" button only)
   2. Storefront Preview (existing, unchanged props)
   3. Store Character (existing, unchanged)
   4. Seller OAuth (NEW — heading + DiscogsSellerLookupInput)
   5. How It Works (updated step 1 copy)
   6. Lean Bottom (NEW — short sign-off)

4. **Seller OAuth section** — new `<motion.section>` between Store Character and How It Works:
   - Section heading: uses new `seller_section_title` locale key (e.g., "Want this for your store?")
   - Short description paragraph
   - `<DiscogsSellerLookupInput />` component
   - Below the input: subtle "Or apply via waitlist" link to `/apply`

5. **Updated How It Works:**
   - Same 3-step visual layout
   - Step 1 title: uses updated `steps.step1_title` ("Connect with Discogs")
   - All step copy pulled from updated locale keys

6. **Remove Record Fair Callout:**
   - Delete the `<motion.section>` block with `aria-labelledby="home-fair-heading"`

7. **Remove Final CTA:**
   - Delete the last `<motion.section>` block before the closing `</MarketingLayout>`
   - Replace with lean bottom section

8. **Lean bottom section:**
   - A single `<motion.section>` with short text and optional subtle link
   - Uses `bottom_signoff` locale key
   - Minimal padding (py-6 sm:py-8 instead of the old py-10 sm:py-16)

9. **Framer Motion:** All sections keep existing motion patterns:
   - `fadeUp` / `fadeIn` variants
   - `border-t border-mc-border` separators
   - `py-10 sm:py-16` padding (except bottom section which uses less)

10. **Mobile-first responsive:**
   - All section layouts use Tailwind responsive classes
   - Sections stack naturally on compact (≤767px)
   - Two-column grids on comfy/wide remain unchanged for store character cards

**Patterns to follow:**
- Existing section structure in `home.tsx` (motion wrappers, section headings, padding, border separators)
- Existing fadeUp/fadeIn variants
- Existing `ctaBase` class string (repurpose or rename to avoid confusion with removed CTA)
- `MarketingLayout` wrapper unchanged
- All props from `PagesController#home` remain the same (`copy` + `preview`); the `copy` hash shape changes to reflect new/removed keys

**Test scenarios:**
- Happy path: page renders all 6 sections in correct order
- Edge: no sections are missing or duplicated
- Edge: "Get your store on Milkcrate" button does not appear anywhere on the page
- Edge: "See the demo →" button is present in the hero
- Edge: record fair callout is absent
- Edge: old final CTA section is absent
- Edge: all new locale keys render their values correctly
- Responsive: page sections stack correctly at compact/comfy/wide
- Accessibility: section headings are present and unique across the page (aria-labelledby)

**Verification:**
- Page renders all expected sections in order
- Old sections removed (record fair, final CTA) are absent from the DOM
- New hero copy renders correctly
- New seller OAuth section renders with the DiscogsSellerLookupInput component
- Updated how-it-works steps render with new copy
- No `t()` translation missing errors in the console

---

### U4. Testing

**Goal:** Update existing tests and add new tests for the redesigned home page and the new DiscogsSellerLookupInput component.

**Requirements:** R13, R14 (test coverage for responsive and accessible behavior)

**Dependencies:** U2, U3 (components exist to test)

**Files:**
- Modify: `app/frontend/test/pages/home.test.tsx`
- Create: `app/frontend/components/discogs_seller_lookup_input.test.tsx`
- Modify: `app/frontend/test/pages/page_smoke.test.tsx` (add new surface to emoji regression)
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx` (verify home page at all tiers)

**Approach:**

1. **Update `home.test.tsx`:**
   - Update mock copy constants to match new locale keys
   - Test sections in new order: shopper hero → preview → character → seller OAuth → how it works → bottom
   - Remove tests for record fair callout and old final CTA (assert absence instead)
   - Add test asserting "Get your store on Milkcrate" CTA is absent
   - Add test asserting "See the demo →" is present
   - Add test for seller OAuth section renders `DiscogsSellerLookupInput`
   - Update emoji regression: verify new locale values contain no emoji glyphs
   - Document the new page section order at the top of the test file
   - Add responsive tests at compact/comfy/wide using `renderWithTier`

2. **New `discogs_seller_lookup_input.test.tsx`:**
   - Mock `fetch` for the Discogs lookup API
   - Test all states: idle, loading, preview, error_not_found, error_active_store, error_applicant, error_api
   - Test CSRF token reading from `<meta>` tag
   - Test claim button renders hidden form with correct action URL
   - Test keyboard navigation: tab through input → submit → result
   - Test `aria-live` region announces state transitions
   - Test focus moves to result container on success/error
   - Test responsive layout: component snapshots at compact/comfy/wide
   - Test AbortController cleanup on unmount
   - Test input validation: rejects empty submission without API call

3. **Update `page_smoke.test.tsx`:**
   - Ensure the home page is in the emoji regression matrix
   - No changes needed if the home page is already covered

4. **Update `responsive_surface_matrix.test.tsx`:**
   - Ensure home page renders at all three tiers without errors
   - No changes needed if the home page is already covered — but verify the new sections render correctly at each tier

**Patterns to follow:**
- Existing `home.test.tsx` patterns: `makePreview(overrides)` factory, `renderWithTier`, section-organized test blocks
- `invitation.tsx` probe has no direct test — but the new component tests should validate the fetch pattern directly
- `discogs_connection_controls.test.tsx` for OAuth form test patterns

**Test scenarios:**
- See U2 for DiscogsSellerLookupInput test scenarios
- See U3 for home page layout test scenarios
- Emoji regression: no emoji in any new locale values
- Responsive: home page renders at compact/comfy/wide without layout shift

**Verification:**
- All existing tests pass with the new component structure and locale keys
- `discogs_seller_lookup_input.test.tsx` covers all component states
- `page_smoke.test.tsx` passes (no emoji regression)
- `responsive_surface_matrix.test.tsx` passes at all tiers

---

## System-Wide Impact

- **Interaction graph:** The home page (`app/frontend/pages/home.tsx`) is the primary public entry point. Changes to its section order and behavior affect all anonymous visitors.
- **The `/api/discogs/lookup/:username` endpoint** gets a new `store_status` field. The invitation page (`stores/invitation.tsx`) uses the same endpoint — verify backward compatibility (the invitation page ignores unknown fields, so it should work without changes).
- **`PagesController#home`** still passes `copy` + `preview` props. The `copy` hash shape changes (new keys added, old keys removed). No other Inertia page or component destructures the home page's `copy` prop, so the change is isolated.
- **`config/locales/en.yml`** changes under `en.pages.home.*`. Other pages use different locale subtrees (`en.pages.apply.*`, `en.pages.stores.*`). No cross-page locale impact.
- **Error propagation:** If the Discogs lookup API is down, the seller OAuth section shows `error_api` state; the rest of the page renders normally. This is a graceful degradation — the page still works for shoppers.
- **Unchanged invariants:** `MarketingPreviewPresenter`, `DiscogsSellerLookup` base cache behavior, `AuthorizeStoreService`, `AuthCallbackService`, all routes, all models, all other page components.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Existing I18n keys removed from locales break other components | Audit `grep -r "record_fair_title\|record_fair_body\|cta_apply\|footnote" app/` — these keys are used only in home.tsx. Verify before removing. |
| The `/api/discogs/lookup/:username` endpoint is used by the invitation page; adding `store_status` field could cause unexpected behavior if the frontend parses strictly | JSON.parse is lenient — unknown fields are ignored. Verify by checking the invitation page's `LookupResponse` type on the frontend. |
| New `copy` prop shape could break if `PagesController#home` has other consumers | Search for `render inertia: "home"` — only `PagesController#home` renders this page. |
| The `["home"]` segment of the I18n file is large; removing keys without verifying their consumers could cause silent missing-translation warnings | Use `missing_keys` or grep approach to confirm each removed key has no other consumer. |
| OAuth flow failure (expired request token, Discogs down) leaves the user in a confusing state | The AuthorizeStoreService already handles errors with user-visible messages. No change needed for the home page — the error surfaces during the OAuth redirect. |

---

## Documentation / Operational Notes

- The `config/locales/en.yml` changes are the single source of truth for all page copy. Update `docs/solutions/` if any locale-related learnings are captured during implementation.
- The DiscogsSellerLookupInput component should be added to the component documentation or Storybook if one exists.
- After deployment, verify the home page smoke tests pass in CI before merging.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-25-home-page-redesign-requirements.md](../brainstorms/2026-05-25-home-page-redesign-requirements.md)
- Related code: `app/frontend/pages/home.tsx`
- Related code: `app/frontend/pages/stores/invitation.tsx` (Discogs probe pattern)
- Related code: `app/services/discogs_seller_lookup.rb`
- Related code: `app/controllers/api/discogs_lookup_controller.rb`
- Related test: `app/frontend/test/pages/home.test.tsx`
- Related knowledge: `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- Related knowledge: `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
