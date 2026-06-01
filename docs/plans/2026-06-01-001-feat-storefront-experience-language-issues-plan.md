---
title: "feat: Codify unified storefront experience language"
type: feat
status: active
date: 2026-06-01
origin: docs/brainstorms/2026-05-31-storefront-experience-language-requirements.md
reconstructed: true
---

# feat: Codify Unified Storefront Experience Language

## Summary

Split the storefront experience language work into independently shippable
issues. The product model treats store, wall, crate, record, pile, and Discogs
handoff as one connected browsing session, while keeping precise Discogs names
at integration boundaries.

This plan was reconstructed from the preserved issue bodies for #215, #216,
and #217 after the original untracked plan artifact was removed.

---

## Problem Frame

Milkcrate's current backend and integration work is substantially clearer than
the frontend product model that connects the shopper journey. Future work needs
a canonical source for the storefront vocabulary and a deliberate sequence for
turning that vocabulary into audit and hierarchy work.

---

## Scope Boundaries

- Do not rename backend models, services, controllers, or Discogs integration
  concepts as part of this language work.
- Do not introduce checkout, cart, reservation, or purchase-completion claims.
- Do not treat mobile-first as mobile-only.
- Do not start with isolated component polish before the storefront loop is
  evaluated as a system.

---

## Implementation Units

### U1: Document the unified storefront experience model

**Issue:** #215

**Goal:** Make the experience model discoverable outside the brainstorm
artifact so future work treats store, wall, crate, record, pile, and handoff as
one connected session.

**Requirements:**

- Shopper-facing copy uses the core nouns store, wall, crate, record, pile, and
  handoff where they clarify the browsing loop.
- The app does not use "register" as a primary shopper-facing noun because
  Milkcrate does not provide checkout.
- Store floor, crate browsing, record inspection, pile review, and Discogs
  handoff feel like connected moments in one storefront session.
- Transitions preserve context and shopper intent when entering a crate,
  inspecting a record, adding to the pile, opening the pile, returning to
  browse, or leaving for Discogs.
- Mobile-first means the compact sequence defines the product hierarchy, not
  that mobile is the only designed environment.
- Desktop and larger layouts adapt outward by revealing context, previews, and
  parallel inspection while preserving the same loop, vocabulary, and state
  model.
- Frontend confidence is evaluated at the system level across hierarchy, copy,
  motion, affordance, responsive adaptation, and accessibility before isolated
  component polish drives the roadmap.
- Presentation code may use tactile product language, but Discogs integration
  code keeps precise external-system names.
- Changes prefer targeted hierarchy docs, copy, aria-label, and test updates
  before broader component or data-model renames.

**Files:**

- Modify: `docs/product.md`
- Modify: `docs/design.md`
- Modify: `docs/design-system/patterns.md`
- Reference: `docs/brainstorms/2026-05-31-storefront-experience-language-requirements.md`

**Approach:**

- Add a concise "Unified storefront experience" section to product/design
  documentation.
- Define store, wall, crate, record, pile, and handoff in product terms.
- Define the flow principle: the storefront should feel like one browsing
  session, not separate page tools.
- Capture the responsive principle: mobile defines the sequence; larger
  screens adapt that same sequence outward.
- Capture the frontend confidence principle: hierarchy, copy, motion,
  affordance, responsive adaptation, and accessibility should be reviewed
  together.
- Record the boundary rule: physical language in presentation, precise Discogs
  language at integration boundaries.
- Explicitly reject "register" as a shopper-facing primary noun.

**Test Scenarios:**

- Documentation scan: canonical docs mention the six core nouns and the
  handoff/register decision.
- Documentation scan: canonical docs describe the one-session flow and
  mobile-first adaptive model.
- Documentation scan: canonical docs identify frontend cohesion, not backend
  comprehensiveness, as the current confidence gap.
- Documentation scan: no absolute file paths are introduced.

**Acceptance Criteria:**

- A future implementer can find the storefront experience model without
  reading the brainstorm transcript.
- The docs make clear that mobile-first means source sequence, not mobile-only
  design.
- The docs make clear that this language does not require backend/service
  renames.

### U2: Audit the shopper-facing frontend as one storefront system

**Issue:** #216

**Goal:** Identify where the current frontend breaks the feeling of one
continuous record-store experience before changing isolated components.

**Dependencies:** Should follow U1 so the canonical vocabulary is available.

**Files:**

- Create: a frontend cohesion audit under `docs/brainstorms/` or
  `docs/reviews/`
- Reference: `docs/product.md`
- Reference: `docs/design.md`
- Reference: `docs/brainstorms/2026-05-31-storefront-experience-language-requirements.md`
- Reference: `app/frontend/pages/stores/show.tsx`
- Reference: `app/frontend/components/store_floor.tsx`
- Reference: `app/frontend/components/crate_view.tsx`
- Reference: `app/frontend/components/record_card.tsx`
- Reference: `app/frontend/components/record_details.tsx`
- Reference: `app/frontend/components/pile_sheet.tsx`
- Reference: `app/frontend/layouts/app_layout.tsx`

**Approach:**

- Audit the mobile shopper journey from store landing through Wall, crate,
  record, pile, and Discogs handoff.
- Score each transition for hierarchy, continuity, tactile affordance, copy,
  responsive adaptation, accessibility, and conversion clarity.
- Separate backend/integration confidence from frontend experience confidence
  so the audit does not reopen sound backend work.
- Identify the smallest frontend issues that would most improve the feeling of
  one unified storefront.
- Use the audit to validate whether downstream issues are still in the right
  order.

**Acceptance Criteria:**

- The team can name the top frontend cohesion gaps with evidence.
- The audit explains why Wall, crate, record, pile, and handoff do or do not
  feel like one experience today.
- Follow-up UI issues are prioritized by storefront continuity, not by easiest
  component edits.

### U3: Define the mobile-first adaptive store hierarchy

**Issue:** #217

**Goal:** Make the compact storefront IA explicit as the source sequence, then
define how that same sequence adapts outward on larger screens.

**Dependencies:** Should follow U2 so the hierarchy work is grounded in the
frontend cohesion audit.

**Files:**

- Create or modify: a storefront mobile hierarchy requirements doc under
  `docs/brainstorms/`
- Modify if needed: `docs/brainstorms/2026-05-31-storefront-experience-language-requirements.md`
- Reference: `app/frontend/pages/stores/show.tsx`
- Reference: `app/frontend/components/store_floor.tsx`
- Reference: `app/frontend/components/crate_view.tsx`
- Reference: `app/frontend/layouts/app_layout.tsx`
- Reference: `app/frontend/components/pile_sheet.tsx`

**Approach:**

- Define the compact storefront as a set of modes: store orientation,
  Wall/Milkcrate Picks entry, crate entry, active crate browsing, record
  inspection, pile review, and Discogs handoff.
- Specify each mode's job, primary content, persistent controls, and transition
  into the next mode.
- Identify which current components own each mode today and where the current
  hierarchy is unclear or duplicated.
- Produce a low-fidelity content order for compact screens, without committing
  to a visual redesign.
- Define how desktop and larger environments adapt the same sequence outward
  through context, previews, and parallel inspection.
- Keep desktop expansion as a secondary adaptation of the same hierarchy, not
  a separate product model.

**Acceptance Criteria:**

- A future implementer can explain how StoreFloor, CrateView, RecordCard,
  PileSheet, and AppLayout fit together on mobile.
- A future implementer can explain how the same pieces adapt on desktop or
  larger layouts without changing the product loop.
- The hierarchy spec does not require immediate visual redesign or backend
  changes.
