# Milkcrate Design System

This directory is the current usage contract for Milkcrate's presentation
layer. It defines how active React surfaces share foundations, components, and
patterns while keeping storefront-specific record, crate, pile, and riffle
interactions distinct.

## Ownership Boundary

The design system owns rendering, visual tokens, responsive composition,
accessible display semantics, focus treatment, reduced-motion behavior, and
callback-shaped presentation APIs. It can render states such as `syncing`,
`failed`, `connected`, or `eligible`.

It does not decide authorization, OAuth/session behavior, seller eligibility,
store curation, synchronization, shopper handoff behavior, route selection, or
backend persistence. Those remain in their existing Rails/application owners.

## Documentation Map

- [Foundations](./foundations.md): theme-safe roles, identity, responsive and
  motion rules, accessibility requirements.
- [Components](./components.md): canonical primitive responsibilities and
  usage rules for repeated controls and state presentation.
- [Patterns](./patterns.md): how primitives compose at the shell and workflow
  level without absorbing domain behavior.
- [Adoption](./adoption.md): active surface inventory, migration status,
  deprecated recipes, and exceptions.

Historical decisions and implementation learnings remain in
`docs/solutions/`. Use this directory to implement new UI; use solution
documents to understand why a rule exists.

## Adding Presentation Work

1. Use semantic foundation roles rather than selecting status palettes in a
   page or component.
2. Reuse a canonical primitive for repeated actions, fields, feedback, status,
   panels, metrics, and empty states.
3. Keep route and domain state in its current surface owner; pass display state
   and callbacks into primitives or patterns.
4. Use only the responsive tiers `compact`, `comfy`, and `wide`, preserving
   guard parity if rendering branches change.
5. Use the motion-token ownership path and preserve the global
   reduced-motion boundary.
6. Add or update behavior, accessibility, and responsive coverage for the
   affected surface.

## Replacement Direction

Active React surfaces must not use page-owned status palettes, duplicate
CTA/field/feedback recipes, deprecated `.mc-btn`, `.mc-input`, `.mc-notice`,
`.mc-text`, `.mc-dim`, or `.mc-border` helpers, or accent-colored focus rings.
Run `npm run lint:design-system` to enforce this boundary. See
[Adoption](./adoption.md) for the compatibility exception that remains outside
active React routes.
