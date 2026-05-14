---
title: "refactor: Align marketing surfaces with product truth and shared storefront language"
type: refactor
status: active
date: 2026-05-14
origin_docs:
  - docs/plans/2026-05-14-001-feat-vendor-brand-responsive-surfaces-plan.md
  - docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md
---

# refactor: Align marketing surfaces with product truth and shared storefront language

## Summary

Tighten the marketing and apply surfaces so they match current product reality, align visually with store/crate surfaces, and present a focused product proof. This pass keeps the shared shell system from U1/U2/U3 intact, but reworks header utility, logo simplicity, CTA consistency, preview scope, and inaccurate claims.

---

## Problem Frame

The current home/apply implementation still feels partially disconnected from the store/crate experience and overstates capabilities in key copy lines. Specific mismatches include: low-value constrained marketing header, complex brand mark that is too final for this stage, uneven hero CTA button heights, homepage preview that duplicates too much of full-store behavior, non-informative card badges, and copy that implies unavailable controls/features.

---

## Scope Boundaries

- No changes to backend curation logic, crate strategy selection, or store sync behavior.
- No new merchant crate-control functionality.
- No implementation of Discogs cart bulk-send behavior.
- No self-serve API key onboarding flow in this pass.
- No route or auth changes for marketing/apply pages.

### Deferred to Follow-Up Work

- Merchant-controlled crate ordering/spotlighting product feature.
- One-click pile-to-Discogs-cart feature implementation.
- API key onboarding UX and backend integration path.

---

## Context & Research

### Relevant code and copy sources

- `app/frontend/layouts/marketing_layout.tsx` currently constrains header internals with `max-w-4xl` while the shell main content uses wider settings.
- `app/frontend/layouts/milkcrate_shell.tsx` already provides a shared surface contract and supports configurable widths/padding.
- `app/frontend/components/brand_mark.tsx` contains the current crate-plus-record icon and `mc-wordmark` treatment.
- `app/frontend/pages/home.tsx` includes:
  - Hero CTAs (`cta_demo`, `cta_apply`),
  - "A live Milkcrate store" preview section via `StorefrontPreview`,
  - store-character cards with letter badges,
  - claims about crate spotlight control and one-click Discogs cart transfer.
- `app/frontend/pages/apply.tsx` renders context bullets from locale copy and currently carries API-key-free framing.
- `config/locales/en.yml` is the source of marketing/apply copy and CTA labels.
- `app/frontend/components/storefront_preview.tsx` already supports section-level preview composition (`picks_wall`, `featured_crates`, `genre_grid`), enabling a picks-only marketing proof without touching core store browsing.

### Institutional guidance to preserve

- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` establishes BrandMark + MilkcrateShell + preview primitives as the shared architecture.
- `STRATEGY.md` calls out onboarding direction toward API key integration and emphasizes honest value framing.

---

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| Keep marketing pages on `MarketingLayout` + `MilkcrateShell`, but change header behavior | Preserves the shared architecture while addressing the visual disconnect you called out. |
| Replace current BrandMark icon with a temporary minimal white record SVG | Matches current design intent: intentionally simple mark we can iterate on later. |
| Keep CTA copy structure but normalize button sizing via shared CTA styles | Fixes visual inconsistency without creating copy churn risk in unrelated contexts. |
| Narrow homepage product proof to picks-first preview | Demonstrates tactile curation without duplicating full demo-store browsing on marketing page. |
| Remove or rewrite capability claims that are not currently shippable | Keeps marketing truthful and prevents expectation debt. |
| Unify wordmark/store header typography via shared token/class contract | Reduces "separate products" feel between home/apply and store surfaces. |

---

## Implementation Units

### U1. Marketing Header Alignment and Utility Decision

**Goal:** Make the marketing header either intentionally minimal or clearly useful, while matching width/structure cues used by store/crate surfaces.

**Requirements:** Structural parity across marketing/store shells; remove low-value constrained toolbar behavior.

**Dependencies:** None

**Files:**
- Modify: `app/frontend/layouts/marketing_layout.tsx`
- Modify: `app/frontend/layouts/milkcrate_shell.tsx` (only if a new shell slot/width prop is needed)
- Test: `app/frontend/layouts/milkcrate_shell.test.tsx`
- Test: `app/frontend/test/pages/page_smoke.test.tsx`

**Approach:**
- Decide one of two implementation branches in code review: remove marketing header entirely for landing/apply, or retain a full-width utility header with explicit purpose (for example, persistent demo/apply action set).
- Eliminate the current internal `max-w-4xl` mismatch when header is retained.
- Keep skip-link and accessibility semantics unchanged through shared shell.

**Patterns to follow:**
- Shared shell slot model in `app/frontend/layouts/milkcrate_shell.tsx`.
- Existing focus-visible/toggle accessibility patterns in `marketing_layout.tsx`.

**Test scenarios:**
- Happy path: home and apply render without layout regression at compact/comfy/wide tiers after header change.
- Edge case: theme toggle remains accessible and keyboard-operable if header is retained.
- Integration: skip-link still targets `#main-content` and remains visible on focus.

**Verification:**
- Marketing top region no longer feels width-constrained relative to store/crate surfaces.

### U2. Temporary Logo Simplification and Wordmark Unification

**Goal:** Replace the current complex icon with a simple white record SVG and unify typography between brand wordmark and store header treatment.

**Requirements:** Simple iterative brand mark; unified visual family between home/apply and store header.

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/components/brand_mark.tsx`
- Modify: `app/frontend/components/brand_mark.test.tsx`
- Modify: `app/frontend/layouts/app_layout.tsx`
- Modify: `app/assets/tailwind/application.css` (or existing frontend style token file where `mc-wordmark`/header typography lives)
- Test: `app/frontend/test/pages/page_smoke.test.tsx`

**Approach:**
- Replace the SVG internals with a minimal white-record treatment while keeping the existing component API (`size`, `showWordmark`) stable.
- Define shared typography token/class rules so store header title and Milkcrate wordmark sit in one family (either same font stack/weight tracking or intentionally paired tokens).
- Keep the implementation explicitly temporary and easy to iterate.

**Patterns to follow:**
- Existing `BrandMark` prop contract and tests.
- Existing header typography usage in `app_layout.tsx`.

**Test scenarios:**
- Happy path: BrandMark still renders correctly for `small` and `large` sizes.
- Happy path: wordmark visible when `showWordmark=true`; accessible label preserved when `showWordmark=false`.
- Regression: no emoji/legacy mark reintroduced on home/apply/store headers.
- Integration: store-name header typography and Milkcrate wordmark typography use the shared class/token contract.

**Verification:**
- Home/apply/store branding looks visually unified with simple interim iconography.

### U3. Hero CTA Consistency and Desktop Height Fix

**Goal:** Ensure "See the demo" and "Get your store on Milkcrate" render at equal heights on desktop (and remain consistent across tiers).

**Requirements:** CTA visual consistency on marketing hero.

**Dependencies:** U1

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Test: `app/frontend/test/pages/home.test.tsx`
- Test: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

**Approach:**
- Refactor hero CTA classes to a single shared style contract (same line-height, padding, min-height, border model).
- Validate this remains true for both "live preview present" and fallback-demo states.

**Patterns to follow:**
- Existing `ctaBase` pattern in `home.tsx`.
- Tier coverage pattern in `responsive_surface_matrix.test.tsx`.

**Test scenarios:**
- Happy path: both hero CTAs exist and share equal computed sizing classes.
- Edge case: fallback demo link path (`/philadelphiamusic`) keeps same button height contract.
- Integration: compact/comfy/wide render without CTA wrapping regressions that break hierarchy.

**Verification:**
- Side-by-side desktop CTAs present uniform height.

### U4. Homepage Proof Recomposition to Picks-First Preview

**Goal:** Replace the broad "live store" preview framing with a focused picks-crate proof that signals curation and tactile presentation without duplicating full store behavior.

**Requirements:** Marketing proof should demonstrate curation quality and tactile browsing; full milkcrate browsing reserved for demo store.

**Dependencies:** U1, U3

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Modify: `app/frontend/components/storefront_preview.tsx` (if picks-only variant prop is needed)
- Modify: `app/presenters/marketing_preview_presenter.rb` (if payload narrowing is server-driven)
- Modify: `app/frontend/types/inertia.ts` (if preview payload contract changes)
- Test: `spec/presenters/marketing_preview_presenter_spec.rb`
- Test: `app/frontend/components/storefront_preview.test.tsx`
- Test: `app/frontend/test/pages/home.test.tsx`

**Approach:**
- Reframe section copy away from "A live Milkcrate store" toward a focused curation proof.
- Render picks-first preview (single crate emphasis) while keeping "See full store" path to demo route.
- Keep bounded payload behavior so homepage remains stable when demo data is unavailable.

**Patterns to follow:**
- Existing bounded preview flow: `PagesController#home` -> `MarketingPreviewPresenter` -> `Home` props.
- Current `StorefrontPreview` composition model.

**Test scenarios:**
- Happy path: when preview data exists, picks-focused crate proof renders and links to full demo store.
- Edge case: no preview sections still renders meaningful fallback CTA copy.
- Error/failure path: presenter fallback path returns stable shape consumed by `Home` without crash.
- Integration: preview module remains non-interactive marketing proof and does not expose full crate-navigation controls.

**Verification:**
- Homepage demonstrates tactile curation value without replicating full storefront navigation.

### U5. Store-Character Card Signal Cleanup

**Goal:** Remove non-informative orange letter badges and ensure cards carry meaningful content-only hierarchy.

**Requirements:** Eliminate decorative tokens that do not encode information.

**Dependencies:** U4

**Files:**
- Modify: `app/frontend/pages/home.tsx`
- Test: `app/frontend/test/pages/home.test.tsx`

**Approach:**
- Remove letter chips (`P/F/G/P`) and rebalance spacing/typography so card titles/body carry the information.
- If iconography remains, it must encode real meaning rather than placeholder letters.

**Patterns to follow:**
- Existing card grid and tokenized color system in `home.tsx`.

**Test scenarios:**
- Happy path: section still renders all intended cards and messaging.
- Regression: previous letter glyphs are absent from rendered card UI.

**Verification:**
- Card section looks intentional without faux-information badges.

### U6. Marketing and Apply Copy Truthfulness Pass

**Goal:** Remove or rewrite inaccurate/forward-looking claims so copy matches current product capabilities and near-term direction.

**Requirements:**
- Do not advertise one-click Discogs cart transfer as existing.
- Do not imply merchant crate spotlight control if unavailable.
- Update API-key messaging to stay truthful today without contradicting planned API-key integration direction.

**Dependencies:** U4, U5

**Files:**
- Modify: `config/locales/en.yml`
- Modify: `app/frontend/test/pages/home.test.tsx`
- Modify: `app/frontend/test/pages/apply.test.tsx`
- Modify: `app/frontend/test/pages/page_smoke.test.tsx`
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`

**Approach:**
- Rewrite specific strings currently causing expectation mismatch:
  - Home card copy about one-click Discogs cart action.
  - Home featured-crate copy implying merchant spotlight control.
  - Apply context and confirmation lines implying API keys are unnecessary in principle.
- Keep copy concise and capability-true; where forward direction is referenced, frame as "current onboarding" vs "future deeper integration".

**Patterns to follow:**
- Existing locale-driven copy architecture (`PagesController` and `WaitlistsController` both read `pages.*`).

**Test scenarios:**
- Happy path: updated strings appear on home/apply render paths.
- Regression: removed inaccurate claims are absent from rendered output.
- Integration: waitlist validation and submitted-state flows continue using updated apply copy without key mismatch.

**Verification:**
- Marketing/apply copy is consistent with shipped functionality and current onboarding posture.

### U7. Cross-Surface Regression and Acceptance Sweep

**Goal:** Confirm visual/content alignment changes do not regress responsive behavior, accessibility, or shared shell expectations.

**Requirements:** Preserve existing behavior while improving coherence and truthfulness.

**Dependencies:** U1, U2, U3, U4, U5, U6

**Files:**
- Modify: `app/frontend/test/pages/responsive_surface_matrix.test.tsx`
- Modify: `app/frontend/test/pages/page_smoke.test.tsx`
- Modify: `app/frontend/test/pages/home.test.tsx`
- Modify: `app/frontend/test/pages/apply.test.tsx`
- Test expectation: none -- no additional production files beyond prior units.

**Approach:**
- Add or adjust assertions for header coherence, CTA parity, copy truthfulness, and preview-scope behavior.
- Keep branch-guard parity coverage for compact/comfy/wide rendering paths.

**Patterns to follow:**
- Existing responsive matrix and smoke test conventions established in the vendor-responsive system docs.

**Test scenarios:**
- Happy path: home and apply render successfully across viewport tiers after all UI/copy updates.
- Edge case: fallback demo preview path and submitted apply state still render correct copy and brand mark.
- Integration: marketing layout updates do not break store/app layout tests that rely on shared shell behavior.

**Verification:**
- Updated surfaces pass existing and new cross-surface frontend tests with no regressions.

---

## System-Wide Impact

- **Marketing UX:** clearer value proposition with less duplicated demo behavior.
- **Brand system:** intentionally simplified interim icon while preserving shared component contract.
- **Content governance:** locale strings become more tightly coupled to real shipped behavior, reducing product-marketing drift.
- **Responsive architecture:** shared shell remains the backbone; this plan adjusts usage, not architecture direction.

---

## Risks and Mitigations

- Risk: Header removal/repurpose introduces nav discoverability loss.
  - Mitigation: retain clear primary CTA visibility and home/apply route access in final accepted header variant.
- Risk: Copy rewrites break tests or duplicate phrasing across test fixtures.
  - Mitigation: update all locale-dependent fixtures together (`home`, `apply`, `page_smoke`, `responsive_surface_matrix`).
- Risk: Picks-only proof feels too thin in some data states.
  - Mitigation: preserve explicit fallback copy and "see full store" CTA to demo.

---

## Deferred Implementation Notes

- Exact final wording for revised marketing lines should be selected during implementation review to balance clarity and tone, but all rewritten lines must remain capability-true.
- If typography unification requires broader token refactoring than expected, land minimal class-level unification in this plan and defer full type-scale overhaul.

---

## Acceptance Checks

- Marketing header treatment is intentionally useful or intentionally absent, with no arbitrary width mismatch.
- Brand mark is simplified to a white record SVG while preserving component API.
- Desktop hero CTAs are equal height.
- Homepage proof section emphasizes picks-style curation rather than full-store duplication.
- Store-character cards no longer show meaningless letter badges.
- Inaccurate claims (one-click Discogs cart, merchant crate spotlight control, "no API keys needed" framing) are removed or accurately reframed.
- Home/apply wordmark and store header typography feel unified through shared style rules.
