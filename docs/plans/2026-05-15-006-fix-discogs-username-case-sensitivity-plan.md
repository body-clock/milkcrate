---
title: fix: Make store slugs case-insensitive for Discogs username matching
type: fix
status: active
date: 2026-05-15
---

# fix: Make store slugs case-insensitive for Discogs username matching

## Summary

When a store is onboarded with a Discogs username containing uppercase characters (e.g., `"MyRecordStore"`), the store page is only accessible at `/:slug` when the slug casing exactly matches the stored username. Visit `/myrecordstore` (lowercase) returns the `no_stores` fallback. This fix normalizes Discogs usernames to lowercase on storage and makes URL-based lookups case-insensitive, so store pages work regardless of slug casing.

---

## Problem Frame

The route `/:slug` maps to `StoresController#show`, which looks up the store via `Store.find_by(discogs_username: params[:slug])`. PostgreSQL string comparison is case-sensitive by default, so a store created with `discogs_username: "MyStore"` only matches the URL `/MyStore`, not `/mystore` or `/MYSTORE`. The Discogs API itself treats usernames case-insensitively, so there is no technical reason to preserve mixed casing.

---

## Requirements

- R1. Store pages at `/:slug` must resolve regardless of the casing used in the slug (uppercase, lowercase, mixed)
- R2. New stores created via `milkcrate:add_store` or any other path must store the Discogs username in a consistent case to prevent accidental duplicates
- R3. Existing stores with mixed-case usernames must continue to work without manual data fixes

---

## Scope Boundaries

- This fix covers only the `Store` model and `StoresController#show` lookup. The `Waitlist` model's `discogs_username` is not used for URL lookups and is out of scope.
- No frontend changes — the `discogs_username` is already exposed in API responses; normalizing to lowercase is a cosmetic improvement in the UI, not a breaking change.

---

## Context & Research

### Relevant Code and Patterns

- **Store model:** `app/models/store.rb` — currently has validations but no normalization callback
- **Stores controller:** `app/controllers/stores_controller.rb` — `show` action does `Store.find_by(discogs_username: params[:slug])` (case-sensitive)
- **Store onboarding rake task:** `lib/tasks/milkcrate.rake` — `milkcrate:add_store` creates stores with the username as-provided via `Store.create!(discogs_username: username, name:)`
- **Store presenter:** `app/presenters/crate_presenter.rb` — exposes `discogs_username` in store props to the frontend
- **Existing tests:** `spec/requests/stores_spec.rb` — tests store page at `/teststore` and crate building integration

### Institutional Learnings

- No existing learnings in `docs/solutions/` apply to this pattern.

---

## Key Technical Decisions

- **Normalize on storage (model callback):** A `before_validation` callback in the `Store` model downcases `discogs_username`. This ensures uniqueness validation catches casing collisions (e.g., preventing both "Store" and "store") and keeps all stored values consistent. It runs before validation so the uniqueness check operates on the normalized value.
- **Case-insensitive lookup (scope):** A model scope or class method for case-insensitive lookup handles existing uppercase usernames during the transition period. After existing data is normalized, this becomes belt-and-suspenders but remains harmless.
- **Existing data normalization (rake task):** A one-time rake task downcases all existing `discogs_username` values that aren't already lowercase. The uniqueness constraint ensures no collisions.
- **No change needed for Settings-based lookups:** `Store.find_by(discogs_username: Settings.discogs_username)` in the `featured` action and `marketing_preview_presenter` uses `Settings.discogs_username` which is already lowercase (`philadelphiamusic`). Normalizing stored data to lowercase makes this naturally consistent.

---

## Implementation Units

### U1. Add normalization callback to Store model

**Goal:** Ensure all future `discogs_username` values are stored in lowercase.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Modify: `app/models/store.rb`
- Test: `spec/models/store_spec.rb`

**Approach:**
- Add `before_validation :normalize_discogs_username` callback
- The private method downcases `self.discogs_username` using `discogs_username&.downcase`
- Place it above the validations so the uniqueness validation sees the normalized value

**Patterns to follow:**
- Existing model callbacks and validations in the same file follow standard Rails conventions

**Test scenarios:**
- **Happy path:** Creating a store with uppercase `discogs_username` stores it in lowercase (e.g., `"MyStore"` becomes `"mystore"`)
- **Happy path:** Creating a store with already-lowercase username stores it unchanged
- **Edge case:** Creating a store with a nil username does not raise (nil-safe downcase)
- **Integration:** Uniqueness validation catches a store with a casing-variant of an existing username (e.g., "Store" and "store" conflict after normalization)

**Verification:**
- `spec/models/store_spec.rb` passes with new examples
- All existing store creation paths store lowercase usernames

---

### U2. Add case-insensitive lookup scope to Store model

**Goal:** Provide a reusable case-insensitive lookup for `discogs_username` that works with both existing and normalized data.

**Requirements:** R1, R3

**Dependencies:** None (but used by U3)

**Files:**
- Modify: `app/models/store.rb`
- Test: `spec/models/store_spec.rb`

**Approach:**
- Add a class method or scope (e.g., `find_by_discogs_username_case_insensitive(username)`) that queries `WHERE LOWER(discogs_username) = LOWER(?)`
- Alternatively, add a scope `scope :with_discogs_username, ->(username) { where("LOWER(discogs_username) = LOWER(?)", username) }`
- The scope is applied in U3 for URL lookups

**Patterns to follow:**
- Standard ActiveRecord scope pattern, consistent with existing model scopes

**Test scenarios:**
- **Happy path:** Looks up an existing store by exact username match
- **Happy path:** Looks up an existing store by uppercase variant of its username
- **Happy path:** Looks up an existing store by mixed-case variant
- **Edge case:** Returns nil for a non-existent username
- **Edge case:** Works correctly when the stored username is already lowercase and the query is uppercase

**Verification:**
- `spec/models/store_spec.rb` passes with new examples

---

### U3. Use case-insensitive lookup in StoresController#show

**Goal:** Make the `/:slug` route resolve regardless of slug casing.

**Requirements:** R1, R3

**Dependencies:** U2 (the case-insensitive scope)

**Files:**
- Modify: `app/controllers/stores_controller.rb`
- Test: `spec/requests/stores_spec.rb`

**Approach:**
- Change `Store.find_by(discogs_username: params[:slug])` to use the case-insensitive lookup from U2
- The `featured` action (line 5) uses `Settings.discogs_username` which is already lowercase and does not need changing

**Patterns to follow:**
- Existing controller structure remains unchanged; only the lookup method changes

**Test scenarios:**
- **Happy path:** Visiting `/teststore` returns 200 for a store with `discogs_username: "TestStore"` (case mismatch)
- **Happy path:** Visiting `/TestStore` returns 200 (direct match with stored value)
- **Happy path:** Visiting `/TESTSTORE` returns 200 (all uppercase)
- **Edge case:** Visiting `/unknownstore` still returns the `no_stores` fallback (non-existent store)
- **Integration:** The store props returned to the frontend show the (now lowercased) username

**Verification:**
- `spec/requests/stores_spec.rb` passes with new examples
- Manual test: onboard a store with mixed-case username, verify all casing variants of the slug resolve

---

### U4. Add rake task to normalize existing Discogs usernames

**Goal:** Provide a one-time mechanism to downcase existing uppercase `discogs_username` values in production, so all data is consistent.

**Requirements:** R3

**Dependencies:** U1 (normalization pattern established)

**Files:**
- Modify: `lib/tasks/milkcrate.rake`
- Test: `spec/tasks/milkcrate_add_store_spec.rb` (or a new spec file for the new task)

**Approach:**
- Add a new rake task `milkcrate:normalize_usernames` (or similar) that:
  - Finds all stores where `discogs_username` contains uppercase characters
  - Downcases them via `update_all`
  - Reports how many were updated
- Wrap in a transaction to ensure atomicity
- This is safe because Discogs usernames are case-insensitive — the API accepts any casing
- The uniqueness constraint on `discogs_username` prevents collisions: if "Store" and "store" somehow both exist, the task fails with a constraint violation (edge case that should not occur in practice)

**Patterns to follow:**
- Existing rake tasks in `milkcrate.rake` follow the namespace pattern

**Test scenarios:**
- **Happy path:** A store with uppercase username is downcased
- **Happy path:** A store with already-lowercase username is unchanged
- **Edge case:** Multiple stores with no uppercase usernames results in 0 updates
- **Error path:** If a constraint collision would occur, the task fails with a descriptive error

**Verification:**
- Rake task can be invoked and produces correct output
- After running, all stores have lowercase `discogs_username` values

---

## System-Wide Impact

- **Interaction graph:** The `discogs_username` is used in `DiscogsClient#seller_inventory` and `DiscogsClient#seller_profile` calls. The Discogs API is case-insensitive for usernames, so normalizing to lowercase has no functional impact.
- **Unchanged invariants:** The `Waitlist` model's `discogs_username` handling is unchanged. All Settings-based lookups (`Settings.discogs_username`) remain untouched.
- **API surface parity:** The `discogs_username` in API responses (store props) will now be lowercase for newly created stores. This is a cosmetic improvement, not a breaking change — consumers should already handle any casing.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Existing uppercase usernames in production break after deployment if only U1 is applied | U2 (case-insensitive lookup) handles both old and new data immediately. U4 (normalization task) is a follow-up cleanup. |
| Uniqueness constraint collision during normalization if "Store" and "store" both exist | Extremely unlikely — store onboarding is a controlled process. The rake task runs in a transaction and will fail atomically if a collision occurs. |

---

## Documentation / Operational Notes

No documentation changes needed. The `README.md` references `/philadelphiamusic` which is already lowercase. After deployment, run `bin/rails milkcrate:normalize_usernames` to clean up any existing uppercase usernames.

---

## Sources & References

- Related code: `app/controllers/stores_controller.rb` (line 12), `app/models/store.rb`
