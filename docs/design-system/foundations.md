# Foundations

Foundations are semantic roles and behavioral rules. Components consume these
roles; they must not redefine theme, status, focus, motion, or responsive
policy locally.

## Color And Theme Roles

Theme values are owned by `app/assets/tailwind/application.css`. A semantic
role must be usable in all supported themes and describe purpose rather than a
palette choice.

| Role family | Intended uses |
| --- | --- |
| Surface | Page, raised panel, muted/inset, overlay presentation |
| Text | Primary, secondary/muted, inverse, link/action text |
| Border | Default separation, strong separation, interactive emphasis |
| Action | Primary, secondary, subtle, and destructive interactions |
| Feedback/status | Neutral, success, warning, danger, and progress states |
| Focus | One visible focus treatment for interactive elements in either theme |

Status presentation must include readable text or an accessible label. Color
is reinforcement, not the only communicated state.

Components use Tailwind utilities generated from `@theme inline` semantic
mappings: for example, `text-mc-feedback-danger`,
`bg-mc-feedback-danger-bg`, `border-mc-feedback-danger-border`, and
`ring-mc-focus`. The underlying CSS variables supply theme-specific values;
components do not select raw palette colors.

## Identity

`BrandMark` is the active Milkcrate identity contract. Until a separately
reviewed visual direction is approved:

- use the current mark and wordmark rather than introducing new logo imagery;
- allow wordmark-visible usage in product-level headers and attribution;
- allow icon-only usage only with an accessible identity supplied by the
  surrounding labeled control or explicit component contract;
- use the supported `small` (`24px`) and `large` (`40px`) mark sizes, with
  icon paint inheriting the semantic `text-mc-text` theme role;
- keep theme legibility and header placement covered by tests.

Final logo art direction and static/PWA asset alignment are deferred; a
design-system migration is not approval for a new mark.

## Responsive Vocabulary

The only application viewport tiers are:

| Tier | Meaning |
| --- | --- |
| `compact` | Small viewport/mobile presentation |
| `comfy` | Intermediate/tablet presentation |
| `wide` | Large viewport presentation |

Prefer CSS reflow for styling differences. Use viewport-aware React branches
only when topology or interaction behavior changes. When changing a branched
component, preserve every data, permission, and visibility guard in each
branch and cover the tiers through `renderWithTier` tests.

Reference:
[viewport context architecture](../solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md).

## Motion And Reduced Motion

Interactive motion belongs to `app/frontend/lib/motion_tokens.ts`, consumed
through the existing provider/hooks/component path. CSS-only mirrors may
expose matching values for CSS effects and inspection, but they are not a
second source of interaction decisions.

- Current interaction mirror values are press scale `0.985`, hover scale
  `1.025`, lift `2px`, and tilt `1.5deg`; update the TypeScript owner first.
- Use named motion tokens rather than inline spring, scale, lift, or duration
  decisions in active consumers.
- Keep `StorefrontMotionConfig` as the reduced-motion boundary.
- Do not add decorative motion during a presentation migration.
- Record a domain-specific exception only when a specialized interaction
  cannot express its behavior through the owned token vocabulary.

Reference:
[storefront animation token system](../solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md).

## Accessibility And Focus

- All keyboard-operable controls require a visible theme-safe focus treatment.
- Actions retain native element semantics: navigation is a link and
  submission/action is a button or form action.
- Fields associate labels, hints, and validation messages
  programmatically.
- Feedback and status require visible meaning and appropriate announcement
  behavior when content is dynamic.
- Dialog focus, return focus, inert background behavior, skip links, and one
  primary `main` landmark remain protected system contracts.

## Presentation Boundary

Foundation roles render states received from pages and layouts. They cannot
introduce workflow decisions, endpoint calls, eligibility logic, state
transitions, or data persistence.
