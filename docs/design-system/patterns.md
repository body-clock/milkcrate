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

## Operational Status

Seller and admin dashboards share semantic feedback, status, progress, metric,
field, and action presentation. They may use different density and information
hierarchy. Polling, resync, onboarding, and store status decisions remain
outside primitives.

## Storefront And Pile

The buyer experience composes shared actions and feedback around specialized
record, crate, score, connection, and pile behavior. Dialog lifecycle, shopper
connection, browsing, Wantlist handoff, and tactile interaction remain owned by
their existing domain-facing components.

## Responsive And Motion Checks

- Branching topology must preserve the same data/permission/visibility guards
  at `compact`, `comfy`, and `wide` tiers.
- Existing animation may be expressed through owned motion tokens and the
  reduced-motion provider; migration does not invent new ornamental motion.
- Integration coverage is required where shell/provider boundaries or dialog
  focus behavior are touched.
