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
| Home | `root "pages#home"` | `pages/home.tsx`, `MarketingLayout` | Foundation consumer | Shared action, panel, lookup feedback, permitted motion |
| Seller application | `GET/POST /apply` | `pages/apply.tsx`, `MarketingLayout` | Pending migration | Field, validation/feedback, action contracts |
| Store invitation | Catch-all `GET /:slug` with missing store in `StoresController#show` | `pages/stores/invitation.tsx`, `MarketingLayout` | Pending migration | Actions and async feedback |
| Storefront | Catch-all `GET /:slug` with existing store | `pages/stores/show.tsx`, `AppLayout` | Foundation consumer | Flash/sync feedback and shared action use around domain UI |
| Pile workflow | Storefront child; `POST /pile/add_to_wantlist` | `components/pile_sheet.tsx` | Pending migration | Actions and handoff feedback without dialog/state change |
| Seller dashboard | `GET /dashboard` and dashboard POST actions | `pages/dashboard/index.tsx` | Pending migration | Shell, status, feedback and actions |
| Admin dashboard | `GET /admin` and admin onboarding/lookup actions | `pages/admin/dashboard.tsx` | Pending migration | Fields, feedback, status, metrics and shell composition |

## Residual And Deferred Surfaces

| Surface | Evidence | Status | Disposition |
| --- | --- | --- | --- |
| `app/views/stores/new.html.erb` | `config/routes.rb` has no store `new` route and `StoresController` exposes only `show`/`authorize` | Deferred/unreachable cleanup candidate | Do not make it define active React component APIs; assess removal separately |
| Mailer styling | Excluded by plan boundary | Deferred | Assess after in-application contracts settle |
| Static/PWA identity assets | Brand visual approval not part of this migration | Deferred | Align only after approved identity direction |

## Known Starting Drift

- Motion interaction values are represented in CSS and TypeScript with
  disagreement; foundation normalization must select and enforce one owner.
- Existing pages/components still own duplicated CTA, field, status, and
  feedback recipes.
- Active React consumers still use legacy `.mc-btn`, `.mc-input`, or local
  palette-based status treatments where canonical contracts will apply.

## Adoption Rules

- Active migrated React code does not introduce raw semantic status palette
  choices or new legacy control recipes.
- Domain-specific storefront visuals may remain specialized, but shared
  actions, feedback, focus, and foundation roles are consumed where they fit.
- Any exception must identify its owning component, reason, verification, and
  follow-up or durable rationale in this ledger.
- New active surfaces must be added here with testing expectations before
  shipping.
