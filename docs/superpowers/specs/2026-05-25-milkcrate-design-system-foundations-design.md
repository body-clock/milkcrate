---
title: "Milkcrate design system: foundations-first unification"
date: 2026-05-25
status: pending-spec-review
scope: all-current-ui-surfaces
approach: foundations-first
references:
  - https://designsystem.library.upenn.edu/
  - https://nordhealth.design/
---

# Milkcrate Design System: Foundations-First Unification

## Summary

Milkcrate will develop an in-application design system that makes all current
surfaces feel and behave like one product. The system will be built from the
existing visual language and interaction work, not from a new package or a
replacement component library.

The system covers public marketing and onboarding pages, shopper storefront
browsing and pile workflows, seller and admin dashboards, and any retained
Rails-rendered UI. Its first goal is equal improvement in visual consistency
and interaction consistency: semantic styles, controls, status feedback,
focus, responsive behavior, motion, and documentation must converge together.

The storefront's tactile record-store character remains central. Generic
primitives should support domain components such as records, crates, piles,
and riffle navigation rather than flatten them into administrative UI.

## Approved Decisions

- This is a Milkcrate-only system, not a reusable multi-product library.
- The inventory and design-system contract cover every currently routed UI
  surface, including operational surfaces, and assess residual Rails-rendered
  markup for retention or retirement.
- Visual language and interaction quality are equal priorities.
- The selected approach is foundations-first: normalize rules and contracts,
  then migrate screens in focused slices.
- Documentation should follow the readable foundations/components/patterns
  organization demonstrated by the Penn Libraries Design System, while using
  Nord as a reference for mature token, theme, and component depth.
- A standalone documentation application or Storybook setup is not required
  before component contracts stabilize.
- Design-system work stays in the presentation layer and must not alter
  curation, eligibility, authorization, OAuth, or synchronization rules.

## Goals

1. Define one coherent Milkcrate visual and interaction language.
2. Turn existing tokens, primitives, shells, and domain UI into documented
   system assets with clear ownership.
3. Eliminate competing implementations of repeated controls and feedback
   patterns across screens.
4. Preserve and strengthen accessibility, responsive behavior, and
   reduced-motion behavior as system guarantees.
5. Make future UI additions use established contracts instead of recreating
   local combinations of utility classes.

## Non-Goals

- Extracting a publishable package or supporting another application.
- Rewriting business flows, routes, backend services, or authentication.
- Replacing distinctive storefront interactions with generic dashboard
  components.
- Building a public documentation portal before the internal system is
  coherent.
- Restyling email output during the first migration wave; email branding can
  be assessed later as a separate concern.

## Current Inventory

### Surface Inventory

| Surface | Implementation | Current System Assets | Primary Consolidation Need |
| --- | --- | --- | --- |
| Home `/` | React/Inertia `pages/home.tsx` | `MarketingLayout`, semantic palette, `CrateView` preview | Replace local CTA, panel, and motion recipes with shared contracts |
| Apply `/apply` | React/Inertia `pages/apply.tsx` | `MarketingLayout`, `.mc-input`, `BrandMark` | Establish canonical form, error summary, action, and confirmation patterns |
| Unclaimed/invited store `/:slug` | React/Inertia `pages/stores/invitation.tsx` | `MarketingLayout`, `BrandMark`, motion token use | Consolidate repeated call-to-action and async result-state treatments |
| Storefront `/:slug` | React/Inertia `pages/stores/show.tsx` | `AppLayout`, crate and record components, responsive/motion system | Treat as the expressive reference surface while normalizing notices and actions |
| Pile workflow | React component `components/pile_sheet.tsx` | Strong dialog/focus/responsive tests, motion | Replace legacy button styling with canonical action contracts when migrated |
| Seller dashboard `/dashboard` | React/Inertia `pages/dashboard/index.tsx` | `Button`, `Card` | Join shell, status, and feedback contracts |
| Admin dashboard `/admin` | React/Inertia `pages/admin/dashboard.tsx` | Most `components/ui` primitives | Replace local status, message, and form recipes with semantic primitives |
| Residual Rails store form | ERB `views/stores/new.html.erb` | `.mc-btn`, `.mc-input` CSS recipes | Confirm reachability; if retained, match semantic CSS contracts |
| Mailers and static/PWA assets | ERB/static assets | Limited brand alignment | Record as later brand-alignment scope, not first-wave component work |

The current route table exposes the React/Inertia public, store, seller
dashboard, and admin surfaces. It does not expose an obvious route for
`views/stores/new.html.erb`. The implementation plan must confirm whether that
view remains reachable before deciding whether to migrate or retire its CSS
compatibility needs.

### Existing Foundations Worth Preserving

| Area | Existing Source | Value |
| --- | --- | --- |
| Theme and base color roles | `app/assets/tailwind/application.css` | Dark/light surfaces, foregrounds, borders, and accent vocabulary |
| Theme persistence | `app/frontend/hooks/use_theme.ts` | Existing user-selected theme behavior |
| Responsive vocabulary | `ViewportProvider`, `useViewport`, tier test helpers | Shared `compact`, `comfy`, and `wide` contract |
| Motion behavior | `motion_tokens.ts`, `StorefrontMotionConfig`, tactile hook | Product-specific feel and reduced-motion support |
| Shared shell | `MilkcrateShell`, `MarketingLayout`, `AppLayout` | Landmarks, skip link, content regions, storefront providers |
| UI primitives | `components/ui/*` | A viable primitive starting point, especially for operational screens |
| Domain presentation | `RecordTile`, `CrateShelf`, `CrateView`, `PileSheet` | Milkcrate's product identity and interaction language |
| Regression coverage | page matrix, accessibility, motion, and component tests | Existing safeguards for system migration |

### Confirmed Drift

| Problem | Evidence | Design-System Response |
| --- | --- | --- |
| Motion tokens disagree across sources | CSS mirrors use hover `1.05`, press `0.97`, lift `3px`; TypeScript uses `1.025`, `0.985`, `2px` | Define one authoritative motion contract and generate or synchronize mirrors |
| Status semantics are not tokenized | Dashboard and lookup components use raw emerald, sky, amber, and red utilities | Add semantic status foreground/background/border roles usable in both themes |
| Buttons have competing implementations | React `Button`, `.mc-btn`, and repeated inline CTA class strings coexist | Establish canonical action contracts and a bounded Rails CSS compatibility recipe |
| Forms have competing implementations | Apply form, seller lookup, admin lookup, and Rails form each style fields/messages separately | Define field, hint, invalid, error-summary, and form-action primitives/patterns |
| Feedback states drift | Flash, sync failure, seller lookup, admin results, and pile outcomes use different styling/semantics | Define feedback message and status patterns by semantic tone |
| Shell coverage is partial | Public/storefront layouts use `MilkcrateShell`; dashboards create independent page frames | Add appropriate shell patterns for operational screens without forcing identical density |
| Brand implementation is provisional | `BrandMark` describes itself as temporary and is a record-only mark; prior docs describe a crate-plus-record concept | Record brand contract and refine assets as a deliberate migration slice |
| Page motion remains local | Several pages repeat inline fade/reveal durations and easings | Define permitted entrance/feedback motion patterns after foundation normalization |

## Design System Architecture

The system has four layers. Higher layers compose lower layers; they must not
redefine lower-layer decisions locally.

### 1. Foundations

Foundations provide semantic tokens and rules:

- Identity and brand use.
- Color roles for surface, foreground, border, action, status, and focus.
- Typography roles for display, body, label, utility, and metrics.
- Spacing, size, radius, and elevation guidance.
- Theme behavior and contrast requirements.
- Motion tokens and reduced-motion behavior.
- Responsive tier vocabulary and layout guidance.

Foundation roles are semantic, not palette-driven. A component should consume a
`danger` or `surface-raised` role rather than choose a red or brown directly.

### 2. Primitives

Primitives provide reusable visual and interaction contracts:

- Actions and action-like links.
- Form label, field, select, textarea, hint, and validation feedback.
- Feedback messages and inline notices.
- Badge, status dot, and progress display.
- Card/panel, section header, metric, and empty state.
- Focus, loading, and visually hidden accessibility helpers where warranted.

Primitives own their relevant states: default, hover, focus-visible, disabled,
busy, invalid, success, warning, danger, and progress.

### 3. Patterns

Patterns compose primitives for repeated tasks and product contexts:

- Page shell and navigation patterns.
- Seller onboarding form and seller lookup result patterns.
- Operational dashboard status and metric patterns.
- Storefront alert and action patterns.
- Record, crate, and pile presentation patterns.
- Empty, loading, confirmation, failure, and recovery patterns.

Domain patterns keep Milkcrate terminology and behavior. `CrateShelf` should
remain a crate component, not become a generic content card.

### 4. Surfaces

Surfaces compose patterns around route-specific content and application state:

- Home, apply, and invitation pages.
- Storefront browsing and pile flows.
- Seller dashboard.
- Admin dashboard.
- Retained Rails-rendered views.

Surfaces pass workflow state and callbacks into presentation contracts. They
do not locally recreate canonical buttons, fields, status colors, or alert
treatments once those contracts exist.

## Presentation Layer Boundary

The design system owns rendering, styling, accessibility semantics, display
states, and callback interfaces. It may receive values such as `syncing`,
`failed`, `eligible`, or `connected` and render the appropriate pattern.

It does not:

- decide whether a seller can be onboarded;
- query Discogs or select store curation;
- determine authorization or session behavior;
- schedule synchronization or enrichment;
- reshape backend domain rules to suit a component API.

This keeps domain and application decisions in their existing Rails layers
while allowing the presentation layer to become consistent.

## Documentation Model

Documentation will initially live in the repository and be organized for use,
not simply as implementation notes:

### Foundations

- Identity and logo usage.
- Colors, themes, and semantic status roles.
- Typography.
- Spacing, layout, radius, and elevation.
- Responsive behavior.
- Motion and reduced-motion.
- Accessibility and focus.

### Components

- Actions and links.
- Fields and forms.
- Feedback and notices.
- Badges, status, and progress.
- Cards, panels, section headings, metrics, and empty states.
- Brand and navigation elements.

### Patterns

- Storefront browsing.
- Pile workflow.
- Seller onboarding.
- Administrative monitoring.
- Shell and page composition.
- Loading, empty, success, warning, and failure flows.

### Adoption

- Migration status by surface.
- Rules for adding new primitives or patterns.
- Accessibility and interaction checklist.
- Testing requirements.
- Deprecated styling recipes and replacement path.

## Component And Pattern Contract

### Initial Canonical Needs

| Category | Contract | Current Sources To Consolidate |
| --- | --- | --- |
| Brand | Mark, wordmark, icon/assets, theme-safe rendering and usage rules | `BrandMark`, layout headers, static icons |
| Actions | Button and link-action variants, sizes, disabled/busy/focus behavior | `Button`, `.mc-btn`, homepage/apply/invitation CTAs |
| Forms | Label, hint, control, invalid state, field error, error summary | Apply, seller lookup, admin lookup, Rails form |
| Feedback | Neutral, success, warning, danger, progress messages and announcements | Flash notices, lookup results, sync failures, pile results |
| Status | Badge, dot, and progress using one tone vocabulary | Admin primitives and seller dashboard status |
| Surfaces | Panel/card, section heading, empty state, metrics/stats | Dashboard cards and marketing panels |
| Navigation and shell | Brand header, theme control, skip link, content region, attribution | Current React shells and dashboard frames |
| Domain presentation | Record, crate, riffle, and pile components consume foundations/actions/feedback | Storefront component family |

### Extraction Rules

- Extract a primitive when two or more surfaces require the same interaction
  contract, or when accessibility behavior needs a single owned
  implementation.
- Extract a pattern when several primitives repeatedly compose into the same
  workflow state or information arrangement.
- Keep domain-specific components domain-specific where their name and
  behavior improve product clarity.
- React primitives are the primary path for Inertia screens.
- Rails-rendered markup may use matching semantic CSS recipes only when
  retaining an ERB screen is justified.

### Interaction State Requirements

Every applicable primitive or pattern documents and tests:

- Actions: default, hover, focus-visible, disabled, and busy.
- Fields: default, focus-visible, entered, invalid, disabled, hint/error
  relationships, and required semantics where applicable.
- Feedback/status: neutral, success, warning, danger, progress, visible text,
  and correct announcement behavior.
- Responsive structural variants only where component topology changes at an
  existing tier.
- Reduced-motion behavior for all motion-bearing patterns.

## Migration Sequence

### Phase 1: Inventory And Contract

Deliver the approved system design, inventory, boundaries, documentation
structure, and migration map. No production presentation behavior changes in
this phase.

### Phase 2: Foundation Normalization

- Define complete semantic color roles, including status and focus roles.
- Clarify typography, spacing, radius, and surface hierarchy.
- Establish the authoritative motion-token source and reconcile CSS/TypeScript
  mirrors.
- Specify the brand-mark direction and asset update requirements.

### Phase 3: Primitive Consolidation

- Make actions canonical across React surfaces and define Rails compatibility
  only if retained.
- Establish form and validation primitives.
- Establish message, alert, badge, dot, and progress contracts using semantic
  statuses.
- Consolidate common surface and section presentation primitives.

### Phase 4: Pattern Adoption

- Add shell patterns appropriate to public, storefront, seller, and admin
  contexts while retaining each context's density and functionality.
- Compose onboarding form/result patterns from canonical primitives.
- Apply shared notice, recovery, and action patterns to storefront and pile
  flows.
- Compose status/metric/dashboard patterns for operational screens.

### Phase 5: Surface Migration

Migrate in this priority order:

1. Repeated feedback, status, form, and action states shared by onboarding and
   dashboards.
2. Seller and admin dashboard shell alignment.
3. Storefront and pile adoption of canonical controls and feedback, preserving
   specialized interaction behavior.
4. Brand-mark and static asset refinement.
5. Rails-rendered UI migration or explicit retirement decision after route
   reachability is verified.

### Phase 6: Governance

- Document adoption and deprecation rules.
- Maintain accessibility and responsive review checklists.
- Add token-drift enforcement where duplicate representations are required.
- Keep migration status current until all active surfaces use approved
  contracts.

## Accessibility And Interaction Requirements

- Use semantic HTML by default.
- Use custom interactive containers only for established cases where a
  clickable composite contains nested interactive controls; preserve keyboard
  and accessible-name behavior.
- Provide a visible focus-visible treatment for every interactive primitive.
- Ensure disabled and busy controls communicate state programmatically and
  visually.
- Never communicate success, warning, danger, or progress by color alone.
- Ensure fields connect labels, hints, invalid states, and errors
  programmatically.
- Preserve one primary main landmark and skip-link behavior on full page
  surfaces where applicable.
- Honor user reduced-motion preferences for motion-bearing patterns.
- Retain existing `compact`, `comfy`, and `wide` responsive tiers. Prefer CSS
  for visual reflow and the viewport context only for behavior or topology
  changes.

## Testing And Verification

| Test Level | Required Coverage |
| --- | --- |
| Foundation checks | Semantic mapping and motion-token consistency; theme-safe status roles |
| Primitive tests | Variants, interaction states, semantics, busy/disabled/invalid behavior, text-backed status meaning |
| Pattern tests | Shell landmarks, feedback flows, form composition, dashboard presentation, storefront interaction contracts |
| Surface matrix | Critical states for home, apply, invitation, storefront/pile, seller dashboard, and admin dashboard at relevant responsive tiers |
| Accessibility regressions | Focus behavior, skip link, landmarks, dialog/keyboard behavior, no invalid nested interactive markup, reduced motion |
| Visual verification | Manual browser review for each later implementation slice against the relevant system contracts |

Storybook may be introduced after canonical primitive and pattern contracts
exist, if maintaining states and examples inside the running application is no
longer sufficient. It is not an initial milestone dependency.

## Completion Criteria For The Initial System Wave

The initial implementation wave is complete when:

- This inventory and the resulting usage guidance are available in the
  repository.
- Shared semantic foundation roles cover surfaces, text, borders, actions,
  status feedback, and focus in supported themes.
- CSS and TypeScript motion-token representations are synchronized under one
  documented ownership rule.
- Canonical action, field, feedback, status, and panel primitives satisfy all
  repeated needs currently rendered in React surfaces.
- Public, storefront, seller dashboard, and admin dashboard surfaces consume
  those shared contracts wherever applicable.
- Any retained Rails-rendered UI uses matching semantic styling, or its
  retirement/deferment is explicitly documented after reachability review.
- Existing product behavior, responsive behavior, accessibility guarantees,
  and reduced-motion support remain protected by tests.

## Reference Guidance

- Penn Libraries Design System is the documentation model: foundations,
  how-to guidance, and practical reusable patterns, with role-based color and
  accessibility guidance.
- Nord Design System is an architecture reference for token/theme/component
  maturity; Milkcrate will not consume Nord packages or copy Nord branding.
- W3C/WAI Authoring Practices Guide is the reference for keyboard and
  accessibility behavior in interactive widgets.
- The Design Tokens Community Group stable format is a future interoperability
  reference if Milkcrate later needs design-tool or cross-platform token
  exchange; it is not required for the initial in-app implementation.

## Local Sources Reviewed

- `app/assets/tailwind/application.css`
- `app/frontend/lib/motion_tokens.ts`
- `app/frontend/hooks/use_theme.ts`
- `app/frontend/contexts/viewport_context.tsx`
- `app/frontend/layouts/milkcrate_shell.tsx`
- `app/frontend/layouts/marketing_layout.tsx`
- `app/frontend/layouts/app_layout.tsx`
- `app/frontend/components/ui/*`
- `app/frontend/components/brand_mark.tsx`
- `app/frontend/components/record_tile.tsx`
- `app/frontend/components/crate_shelf.tsx`
- `app/frontend/components/crate_view.tsx`
- `app/frontend/components/pile_sheet.tsx`
- `app/frontend/pages/home.tsx`
- `app/frontend/pages/apply.tsx`
- `app/frontend/pages/stores/invitation.tsx`
- `app/frontend/pages/stores/show.tsx`
- `app/frontend/pages/dashboard/index.tsx`
- `app/frontend/pages/admin/dashboard.tsx`
- `app/views/layouts/application.html.erb`
- `app/views/stores/new.html.erb`
- `config/routes.rb`
- `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`
- `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`
- `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
