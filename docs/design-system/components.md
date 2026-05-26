# Components

Canonical components express repeated presentation contracts. They are small,
semantic, and composable; they do not become a route framework or replace
domain interaction components.

## Primitive Catalog

| Contract | Responsibility | Does not own |
| --- | --- | --- |
| Action | Shared variants, sizes, focus, disabled and busy presentation for buttons and action-like links | Element semantics, navigation or submission callbacks |
| Field | Label, hint, input/select/textarea styling, invalid association and disabled/busy display | Form data, validation rules, submission |
| Feedback message | Neutral, success, warning, danger and progress message presentation and announcement behavior | Determining the underlying outcome |
| Badge/status dot/progress | Compact readable operational state treatments using semantic tones | Polling or status transitions |
| Panel/card/section header | Repeated surface hierarchy and labeling | Domain-specific record/crate/pile display |
| Metric | Label/value/supporting context for operational measures | Computation of the value |
| Empty state | Clear absence/recovery presentation, optionally composing an action | Whether results exist |
| Brand mark | Documented active wordmark/icon usage and accessible identity | New brand art direction |

## Action Rules

- Share styling and states across native buttons and action-like links without
  coercing their markup.
- Primary, secondary, subtle, and destructive intent must consume semantic
  roles.
- Busy and disabled actions remain visibly and programmatically unavailable.
- Focus-visible treatment is required on every interactive form.

## Field Rules

- Keep labels visible except where an established accessible control already
  supplies equivalent identity.
- Connect descriptions and error messages to the control through accessible
  attributes.
- Use the semantic danger feedback role for invalid presentation; do not
  choose raw red palette classes in route pages.
- The surface retains form ownership, including Turnstile, routing, network,
  and OAuth behavior.

## Feedback And Status Rules

- Use the common tone vocabulary: `neutral`, `success`, `warning`, `danger`,
  and `progress`.
- Supply visible state text; dots, badges, borders, and color alone are
  insufficient.
- Use live announcement behavior only for updates that need announcement,
  preserving existing workflow behavior.

## Domain Components

`RecordCard`, `CrateView`, `PileSheet`, riffle controls, and related
storefront components remain product-specific. They may consume shared action,
feedback, focus, and foundation contracts around their interactions, but must
not be flattened into generic administrative components.

Reference:
[vendor brand and responsive surface system](../solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md).
