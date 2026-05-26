# Patterns

Patterns describe repeated composition across a workflow or surface family.
They render existing props and callbacks; they do not move application or
domain decisions into presentation code.

## Shell Composition

`MilkcrateShell` is the shared structural owner for skip navigation, header
region, a single primary content landmark, optional post-header feedback, and
footer/content-width composition. Layouts and route surfaces remain responsible
for their own density and workflow policy.

- Marketing surfaces compose brand, theme control, onboarding content, and
  user feedback through the shell.
- Storefront surfaces compose store identity, providers, shopper/pile state,
  flash feedback, and domain content through the shell.
- Operational dashboards may adopt the shell where it removes frame drift;
  the shell must not learn admin state, seller sync behavior, or route actions.

## Seller Onboarding

Home lookup, application, and invitation states share actions, fields, panels,
and feedback treatment. Their existing seller lookup requests, OAuth POST
actions, waitlist behavior, and Turnstile lifecycle stay in the current page
or component owner.

Implemented composition:

- Marketing flash messages use semantic success/danger feedback while
  `MarketingLayout` keeps shell and viewport ownership.
- Seller lookup uses `Field`, `Button`, and `FeedbackMessage`; the successful
  result still submits to `/:slug/authorize`.
- Application validation uses `Field` relationships and danger feedback; its
  Inertia submission and Turnstile setup/cleanup remain page-owned.
- Invitation actions use canonical action styling without changing async
  probing or OAuth/waitlist destinations.

## Operational Status

Seller and admin dashboards share semantic feedback, status, progress, metric,
field, and action presentation. They may use different density and information
hierarchy. Polling, resync, onboarding, and store status decisions remain
outside primitives.

Implemented composition:

- Both operational routes use `MilkcrateShell` for one primary landmark and
  skip navigation while retaining route-owned headers and information density.
- The seller dashboard renders flash messages, sync states, sync failures, and
  resync actions through semantic primitives; its router callbacks remain
  page-owned.
- The admin dashboard composes `Field`, `FeedbackMessage`, `Metric`,
  `EmptyState`, and status primitives around existing lookup, onboarding, and
  polling behavior.

## Storefront And Pile

The buyer experience composes shared actions and feedback around specialized
record, crate, score, connection, and pile behavior. Dialog lifecycle, shopper
connection, browsing, Wantlist handoff, and tactile interaction remain owned by
their existing domain-facing components.

Implemented composition:

- `AppLayout` and the store route render flash and sync lifecycle states with
  semantic feedback while retaining providers, pile focus return, and route
  state ownership.
- Record cards/details and Discogs connect/disconnect forms use canonical
  action styling without changing links, POST destinations, or CSRF inputs.
- Pile Wantlist progress, success, and failure states wrap existing shopper
  transitions with semantic feedback and recovery actions; its dialog focus
  trap and compact/wide panel behavior remain specialized.
- Score breakdown direction uses semantic success/danger roles while its
  scoring inputs and visibility rules remain unchanged.

## Responsive And Motion Checks

- Branching topology must preserve the same data/permission/visibility guards
  at `compact`, `comfy`, and `wide` tiers.
- Existing animation may be expressed through owned motion tokens and the
  reduced-motion provider; migration does not invent new ornamental motion.
- Integration coverage is required where shell/provider boundaries or dialog
  focus behavior are touched.
