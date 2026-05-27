---
title: "Keep refactor helpers private and retire protocol specs after the refactor stabilizes"
date: 2026-05-27
category: best-practices
module: services
problem_type: best_practice
component: testing_framework
severity: medium
applies_when:
  - "Extracting methods to satisfy RuboCop `Metrics/MethodLength` or `Metrics/ClassLength`"
  - "The extracted helpers are internal implementation details, not part of the public API"
  - "Existing behavior specs already cover the user-visible contract"
  - "Considering whether exact method-inventory specs still add value after a refactor"
tags:
  - sandi-metz
  - rubocop
  - method-length
  - class-length
  - private-helpers
  - behavior-specs
  - refactoring
  - testing
---

# Keep Refactor Helpers Private and Retire Protocol Specs After the Refactor Stabilizes

## Context

When a service refactor is driven by RuboCop method-length or class-length limits, the first pass often exposes a bunch of small helper methods. Those helpers are useful during the refactor, but most of them are not intended to become public API. The same is true for exact public-protocol specs that only assert which helper methods happen to exist during the refactor.

The verified refactor for the Discogs and storefront services followed that pattern: helper extraction was necessary to remove RuboCop exceptions, but the useful long-term contract was the behavior of the service entry points, not the exact visibility inventory of every helper.

## Guidance

Keep extracted helpers private unless there is a real caller outside the class. For instance:

```ruby
class ShopperAuthCallbackService
  def call
    client = DiscogsOauthClient.new
    verify_identity(client, token_result)
  end

  private

  def verify_identity(client, token_result)
    client.verify_identity(token_result)
  end
end
```

For class-level helpers, use `private_class_method` or a singleton-class `private` declaration so the refactor does not silently widen the public surface:

```ruby
class TurnstileVerifier
  class << self
    private

    def verify_token(token)
      ...
    end
  end
end
```

Keep behavior specs that exercise the public entry point and observable results. Remove exact protocol specs once they only prove the current internal shape:

```ruby
# Worth keeping
expect(client.call).to eq(expected_payload)

# Usually remove after the refactor settles
expect(described_class.public_instance_methods(false)).to include(:verify_identity)
```

## Why This Matters

Temporary protocol specs are useful while a refactor is in flight because they catch accidental API widening. After the refactor settles, though, they usually become brittle maintenance: they fail when implementation shape changes, even when the public behavior is still correct.

Keeping helpers private also makes the refactor boundary explicit. The class advertises only the contract it intends to support, and the test suite stays focused on that contract instead of on incidental method layout.

## When to Apply

- During Sandi Metz style refactors that extract several small service methods
- When removing `Metrics/MethodLength` or `Metrics/ClassLength` exceptions
- When deciding whether to keep specs that assert helper visibility or exact method lists
- When public behavior is already covered by higher-level service specs

## Examples

The Discogs OAuth and store-sync refactors extracted internal helpers such as consumer construction, identity verification, and cache payload assembly. Those helpers stayed private, while the tests that mattered long term stayed focused on observable service behavior.

The Discogs rate-limit middleware doc is a concrete example of the same style in a different part of the codebase: it describes a small, guarded pipeline with private state and private helper methods rather than a wide public API.

## Related

- [Discogs OAuth 1.0a Integration and Inventory CSV Export](/Users/pperkins/code/p/milkcrate/docs/solutions/integration-issues/discogs-oauth-csv-export-2026-05-22.md)
- [Centralized Discogs Rate-Limit Middleware and Multi-Store Recurring Sync](/Users/pperkins/code/p/milkcrate/docs/solutions/integration-issues/discogs-rate-limit-middleware-2026-05-19.md)
