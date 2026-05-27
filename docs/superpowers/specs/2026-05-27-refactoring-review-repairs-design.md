# Refactoring Review Repairs Design

## Context

The `sandi-metz-rubocop-rules` branch reorganizes Rails controllers, services,
jobs, and strategy objects. Review against Sandi Metz POODR principles and
layered Rails principles found behavioral regressions introduced during method
extraction, as well as several public-protocol and ownership regressions.

This repair pass fixes the confirmed findings within the current branch. It
preserves the refactor's intended object boundaries where those boundaries
remain sound, and removes extracted structure only where it obscures or breaks
an existing contract.

## Goals

- Restore user-visible behavior removed by the refactor.
- Restore single-owner responsibilities for sync lifecycle state and expected
  OAuth validation.
- Keep public protocols narrow: HTTP controllers expose routed actions, and
  orchestration services expose intended operation entry points.
- Add regression coverage for each changed contract before repairing
  production code.
- Correct local observability and query-reuse regressions found during review.

## Non-Goals

- Reworking the full service-object architecture.
- Introducing new domain layers, policies, repositories, or framework
  dependencies.
- General RuboCop metric tuning outside the repaired code paths.
- Changing product requirements for storefront crates or Discogs eligibility.

## Repair Scope

### Storefront Curation

`StorefrontCuration` continues to assemble featured crates in its existing
order. It will once again add a viable Hidden Gems crate after New Arrivals and
Thematic, passing the accumulated exclusions through the existing `add_crate`
path. This restores storefront output, cache payloads, and surfaced-listing
tracking without adding a new abstraction.

`CrateStrategies::Picks` will keep selection-state local to a call. Its
diversity cap will be derived from the requested `count:` and applied to every
genre bucket, including listings without a primary genre. Helpers may remain
only if they receive the operation-specific state explicitly.

### OAuth Authorization And Callback Handling

`AuthorizeStoreService` will retrieve the seller inventory count once for a
request, use that value both to decide minimum eligibility and to construct
any rejection result, and always return its result contract.

`AuthCallbackService` will classify a Discogs identity mismatch as an expected
domain rejection. It will not pass that condition through generic unexpected
exception logging or prepend the unexpected-error message used for operational
failures.

### Sync Lifecycle And Failure Logging

`FullStoreSyncJob` remains responsible for job orchestration, rescue, logging,
and re-raising. `StoreSync::StatusManager` will again own persisted failed-sync
state formatting and transitions, including the diagnostic backtrace summary.

`EnrichmentJob` will retain a loaded store's human-meaningful identity when
reporting an enrichment failure, while preserving an ID fallback if loading
the store itself fails.

### Experiment Result Semantics

`Experiments::SeedGenerator` will keep `excluded_count` defined as the number
of listings excluded because they were already labeled in prior experiment
results. Truncating an otherwise eligible result set to the configured crate
size will not increase that count.

### Public Protocols And Query Reuse

Extracted controller methods that support actions, but are not themselves
routed actions, will be private. This applies to authentication/session,
lookup, rendering, and write-orchestration helpers introduced by this branch.

For extracted services that expose internal state-changing phases with no
external caller, only the intended operation entry point will remain public.
This is limited to methods touched by the repair and verified not to be part of
an external protocol.

`Admin::StoreOnboardingChecks` will reuse the conflict record already obtained
for its branch decision when building the corresponding result, avoiding
duplicate reads and contradictory results.

Introduced one-condition side effects in repaired flows will be written with
guard-oriented control flow where doing so makes the return path explicit and
matches repository conventions.

## Architectural Boundaries

- Controllers remain presentation-layer adapters: accept the HTTP request,
  invoke an operation, and render or redirect.
- Services coordinate one application operation and expose only that
  operation's meaningful public message.
- Strategy objects own selection policy but do not retain per-call selection
  state on the instance.
- Jobs trigger operations and report failures; lifecycle persistence and error
  formatting remain with the status collaborator that already owns them.
- External API reads used for a decision are evaluated once per decision so
  the returned result describes the observed snapshot.

## Error Handling

- Low inventory is a normal unsuccessful authorization result, never a missing
  result or exception caused by a second eligibility read.
- Discogs identity mismatch is an expected callback rejection, distinct from
  external failures or programming errors.
- Sync errors continue to be logged and re-raised, while persisted diagnostic
  details use `StoreSync::StatusManager` formatting.
- Enrichment failures keep sufficient store identity in logs for operational
  diagnosis.

## Test Strategy

Each production repair starts with a failing regression example:

- A viable Hidden Gems strategy result appears in storefront curation output.
- Picks honors a non-default `count:` and caps listings with a nil primary
  genre.
- A rejected low-inventory authorization performs one inventory lookup and
  returns an unsuccessful result.
- A mismatched OAuth identity returns the expected rejection without generic
  unexpected-error handling.
- Failed full syncs persist diagnostic formatting from
  `StoreSync::StatusManager`.
- Experiment exclusion counts reflect prior labels, including when eligible
  inventory exceeds the crate-size limit.
- Extracted controller helpers do not appear in controller `action_methods`.
- Onboarding conflict checks preserve the captured record without requerying.
- Enrichment failure reporting includes a loaded store's identity.

After focused red-green cycles, verification will run the full RSpec suite,
RuboCop, and diff whitespace checks.

## Acceptance Criteria

- All confirmed P1, P2, and P3 review findings in the approved scope are
  repaired or explicitly documented as not applicable after caller analysis.
- New regression specs fail against the reviewed implementation before the
  corresponding production change and pass after it.
- Existing and new test suites pass.
- RuboCop reports no offenses.
- No unrelated user working-tree changes are overwritten or included in repair
  commits.
