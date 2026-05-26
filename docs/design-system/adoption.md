# Adoption Ledger

This ledger records current presentation migration state. It is updated in the
same change that migrates a surface or documents a justified exception.

## Status Meanings

| Status | Meaning |
| --- | --- |
| Foundation consumer | Already uses shared shell/provider/foundation pieces but still has migration work |
| Pending migration | Active route or workflow with known repeated recipes to replace |
| Migrated | Consumes canonical system contracts for the intended initial-wave scope |
| Deferred | Explicitly outside this wave with evidence or a named follow-up |

## Active Routed Surfaces

| Surface | Route evidence | Current presentation owner | Initial-wave status | Migration target |
| --- | --- | --- | --- | --- |
| Home | `root "pages#home"` | `pages/home.tsx`, `MarketingLayout` | Migrated | Shared action and seller lookup feedback/field contracts; existing motion retained |
| Seller application | `GET/POST /apply` | `pages/apply.tsx`, `MarketingLayout` | Migrated | Field, validation/feedback, and action contracts; Turnstile unchanged |
| Store invitation | Catch-all `GET /:slug` with missing store in `StoresController#show` | `pages/stores/invitation.tsx`, `MarketingLayout` | Migrated | Canonical actions and progress feedback; probing/OAuth unchanged |
| Storefront | Catch-all `GET /:slug` with existing store | `pages/stores/show.tsx`, `AppLayout` | Migrated | Semantic flash/sync feedback and shared record/Discogs actions; providers and crate navigation unchanged |
| Pile workflow | Storefront child; `POST /pile/add_to_wantlist` | `components/pile_sheet.tsx` | Migrated | Canonical handoff actions and feedback; dialog/state transitions unchanged |
| Seller dashboard | `GET /dashboard` and dashboard POST actions | `pages/dashboard/index.tsx` | Migrated | Shell, semantic status/feedback and canonical resync action; router actions unchanged |
| Admin dashboard | `GET /admin` and admin onboarding/lookup actions | `pages/admin/dashboard.tsx` | Migrated | Shell, fields, semantic feedback/status, metrics and empty state; polling/onboarding unchanged |

## Shared Contract Adoption

| Contract | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Interim product identity | `components/brand_mark.tsx` | Migrated | Wordmark/icon-only accessible naming and theme-safe `small`/`large` rendering covered by component, page smoke, and accessibility tests |

## Residual And Deferred Surfaces

| Surface | Evidence | Status | Disposition |
| --- | --- | --- | --- |
| `app/views/stores/new.html.erb` | `config/routes.rb` has no store `new` route and `StoresController` exposes only `show`/`authorize` | Deferred/unreachable cleanup candidate | Do not make it define active React component APIs; assess removal separately |
| Mailer styling | Excluded by plan boundary | Deferred | Assess after in-application contracts settle |
| Static/PWA identity assets | Brand visual approval not part of this migration | Deferred | Align only after approved identity direction |

## Enforcement And Compatibility

- `npm run lint:design-system` scans active `app/frontend` TypeScript/React
  sources and rejects deprecated recipe classes, raw status palette utilities,
  and `focus-visible:ring-mc-accent` in place of the focus role.
- `npm run test:frontend` exercises the guard against a synthetic regression
  and requires the active source tree to pass it.

| Exception | Evidence | Disposition |
| --- | --- | --- |
| Server-rendered compatibility classes in `app/views/layouts/application.html.erb` and `app/views/stores/new.html.erb` | Routed presentation controllers explicitly select `inertia_application`; `config/routes.rb` exposes no store `new` route and `StoresController` exposes only `show`/`authorize` | CSS recipes remain deprecated compatibility only; remove with residual Rails template/layout cleanup, not from new React work |
| Dynamic crate/record styling through semantic CSS variables such as `var(--mc-border)` | Specialized tactile/stack visuals need runtime style values but still consume a semantic role rather than raw status palettes | Allowed domain-local visual composition; motion decisions remain guarded by `lint-motion-tokens.ts` |

## Resolved Starting Drift

- Motion interaction mirrors now agree with the TypeScript authority and are
  protected by `lint-motion-tokens.ts`.
- Migrated active routes consume canonical action, field, feedback, status,
  metric, and empty-state contracts for the initial-wave scope.
- Active React consumers no longer use deprecated recipe classes, raw
  semantic-status palettes, or the superseded accent focus-ring utility.

## Adoption Rules

- Active migrated React code does not introduce raw semantic status palette
  choices or new legacy control recipes.
- Domain-specific storefront visuals may remain specialized, but shared
  actions, feedback, focus, and foundation roles are consumed where they fit.
- Any exception must identify its owning component, reason, verification, and
  follow-up or durable rationale in this ledger.
- New active surfaces must be added here with testing expectations before
  shipping.
