---
title: "refactor: Address remaining Sandi Metz POODR violations across services, controllers, presenters, and specs"
type: refactor
status: active
date: 2026-05-21
---

# Refactor: Address Remaining Sandi Metz POODR Violations

## Summary

Address the Sandi Metz POODR findings that remain uncovered by recent refactoring work. The models layer was addressed by `2026-05-19-002-refactor-models-sandi-metz-plan.md` (implemented), and core layered-architecture fixes were addressed by the completed layered plans. What remains: hardwired dependency injection in services, overlong controller methods, large presenter methods, 4-classes-in-1-file crate strategies, long reconciliation/normalizer methods, and systemic spec quality issues (private-method testing via `send`, repeated helpers, excessive mocking, Arel introspection). This plan tackles each gap in dependency order, prioritizing testability improvements first.

---

## Problem Frame

The May 21 comprehensive Sandi Metz review found violations across 85+ files. Recent work (May 19-21) extracted scoring strategies, value objects, query objects, sync lifecycle managers, enrichment lifecycle managers, and a curation cache — addressing the models layer and core service architecture. However, these gaps remain:

- **Services:** `StoreSyncService` and `EnrichmentService` still hardwire `DiscogsClient.new` in constructors, making unit testing impossible without HTTP stubbing. `ListingReconciler#call` (47 lines) and `ListingNormalizer#call` (30 lines) violate the 5-line rule. `CrateStrategies` crams 4 classes into one file.
- **Controllers:** `Admin::DiscogsLookupsController#show` (16 lines, 4 response branches), `Admin::OnboardingsController#direct` (18 lines, 3 duplicate guards), and `WaitlistsController#create` (17 lines, turnstile + creation + 2 emails) all exceed the 5-line method limit and mix orchestration with response rendering.
- **Presenters:** `CratePresenter#listing_props` (20 lines), `MarketingPreviewPresenter#preview_data` (11 lines with rescue), and `MarketingPreviewPresenter#cap_sections` (13 lines) exceed the method limit and mix concerns.
- **Specs:** 6 examples call private methods via `send`, 10 files duplicate `def listing(...)` helpers, 3 files duplicate `auth_headers`, and `discogs_rate_limit_middleware_spec.rb` stubs `sleep` across 12/13 examples. `DailyCurationService` spec has excessive mocking (7 lets + 3 stubs + 2 doubles for one method).
- **Config/Analysis:** Minor findings deferred.

---

## Requirements

- R1. Make `StoreSyncService` and `EnrichmentService` accept injectable dependencies (eliminate hardwired `DiscogsClient.new` and `MusicBrainzClient.new`)
- R2. Reduce `StoreSync::ListingReconciler#call` from 47 lines to ≤5 per method by extracting named private methods
- R3. Reduce `StoreSync::ListingNormalizer#call` from 30 lines to ≤5 per method by extracting field-level extractors
- R4. Split `CrateStrategies` into one file per strategy class (Picks, NewArrivals, Thematic, HiddenGems)
- R5. Decompose `Admin::DiscogsLookupsController#show` (16 lines, 4 branches) into a use-case object
- R6. Decompose `Admin::OnboardingsController#direct` (18 lines, duplicate guards with `#create`)
- R7. Decompose `WaitlistsController#create` (17 lines, turnstile + creation + emails)
- R8. Eliminate duplicate credential lookup in `Admin::BaseController`
- R9. Reduce `CratePresenter#listing_props` from 20 lines by extracting listing serialization
- R10. Reduce `MarketingPreviewPresenter#preview_data` and `#cap_sections`
- R11. Eliminate all `send(:private_method)` calls in specs — test through public interfaces
- R12. Extract repeated spec helpers (`def listing(...)` across 10 files, `auth_headers` across 3 files)
- R13. Eliminate `instance_variable_set` in client specs by using constructor injection
- R14. Eliminate `sleep` stubbing in rate limit middleware spec
- R15. Reduce mocking in `DailyCurationService` spec
- R16. Replace Arel AST introspection in `Listing` spec with behavioral test
- R17. Preserve all existing public interfaces — no schema changes, no frontend prop changes, no route changes

---

## Scope Boundaries

- No schema changes, database migrations, or new columns
- No changes to frontend Inertia props or TypeScript components
- No changes to routes or request/response JSON shapes
- No changes to external API clients (DiscogsClient, MusicBrainzClient contracts)
- No changes to the RecordScorer or scoring strategies (already refactored)
- No changes to StorefrontCuration caching (already refactored)
- No changes to the available query object or store lifecycle managers (already refactored)

### Deferred to Follow-Up Work

- `DailySelectionService` weight-constant extraction to a configurable `SelectionWeights` value object — low impact, reserved for when weights need calibration
- `StorefrontCuration` full decomposition (212 lines) — the cache extraction addressed the most expensive recomputation; decomposition of crate-building is lower priority
- `Admin::StoreHealth` polymorphic state objects (6-branch if/elsif) — the service extraction from the layered follow-up plan addressed the immediate concern
- `config/initializers/mission_control_jobs.rb` boolean-coercion abstraction — minor, initializer
- `analysis/analyze.rb` and `analysis/report.rb` procedural script extraction — not domain code

---

## Context & Research

### Relevant Code and Patterns

| Pattern | Example | Apply to |
|---------|---------|----------|
| Constructor injection with defaults | `DiscogsSellerLookup.new(username, client: DiscogsClient.new)` | `StoreSyncService`, `EnrichmentService` |
| Sub-service extraction | `StoreSync::InventoryFetcher`, `StoreSync::ListingReconciler` | Private method extraction in `ListingReconciler` and `ListingNormalizer` |
| One-class-per-file strategy | `ScoreStrategies::ConditionStrategy` (separate files) | `CrateStrategies::Picks`, `::NewArrivals`, `::Thematic`, `::HiddenGems` |
| Use-case service object | `DiscogsSellerLookup`, `TurnstileVerifier` | `DiscogsSignupAvailability`, `OnboardingExistence`, `WaitlistRegistration` |
| Shared spec support helper | `spec/support/storefront_curation_helpers.rb` | `spec/support/listing_helpers.rb`, `spec/support/admin_auth_helpers.rb` |

### Institutional Learnings

- **Guard-parity audit** (`docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`): After splitting a method across extracted objects, verify every precondition/guard appears on every extracted path. Apply to controller extractions (U5-U7).
- **Crate strategies pattern** (`docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`): Each strategy implements `select(pool, excluded_ids:)` with a consistent interface. When splitting into separate files, preserve the interface and the score-once-then-filter pattern.
- **Characterization testing** (layered follow-up plan): Before moving behavior, pin the existing output with characterization specs. Apply to all controller and presenter extractions.

### External References

Not required — the codebase has direct local examples of every pattern needed.

---

## Key Technical Decisions

- **Testability improvements come first** (U1) so subsequent extractions can be tested with injected dependencies rather than HTTP stubbing.
- **Spec cleanup comes after refactoring (U11 — private-method testing via send)** — some spec issues (instance_variable_set, private method testing via send) will naturally resolve once constructors accept dependencies and public interfaces exist. Others (repeated helpers, Arel introspection, sleep stubbing) are independent.
- **Controller extractions follow the DiscogsSellerLookup pattern**: extract a use-case service object that handles validation, lookup, and branching, leaving the controller as a thin param→call→render wrapper.
- **CrateStrategies file split is purely mechanical**: move each class to its own file under `app/services/crate_strategies/`, update autoloading, zero behavior change.
- **Presenter extractions prefer private method decomposition over new files**: `CratePresenter#listing_props` decomposes into `base_props`, `enrichment_props`, `display_props` rather than introducing a full ListingSerializer. If a second consumer emerges later, extraction becomes warranted.

---

## Implementation Units

### U1. Testability: Make Service Dependencies Injectable

**Goal:** Make `StoreSyncService` and `EnrichmentService` accept injectable dependencies, eliminating hardwired `DiscogsClient.new` and `MusicBrainzClient.new` from constructors.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `app/services/store_sync_service.rb`
- Modify: `app/services/enrichment_service.rb`
- Modify: `spec/services/store_sync_service_spec.rb`
- Modify: `spec/services/enrichment_service_spec.rb`
- Modify: `spec/services/discogs_client_spec.rb` (remove instance_variable_set by passing connection via constructor)
- Modify: `spec/services/music_brainz_client_spec.rb` (remove instance_variable_set by passing search_conn: and caa_conn: via constructor)
- Modify: `spec/services/discogs_rate_limit_middleware_spec.rb` (remove instance_variable_set by passing connection via constructor)

**Approach:**

*StoreSyncService:*
```ruby
# Before:
def initialize(store)
  @store = store
  @client = DiscogsClient.new
  @normalizer = StoreSync::ListingNormalizer.new
end

# After:
def initialize(store, client: DiscogsClient.new, normalizer: StoreSync::ListingNormalizer.new)
  @store = store
  @client = client
  @normalizer = normalizer
end
```

*EnrichmentService:*
```ruby
# Before:
def initialize
  @discogs = DiscogsClient.new
  @musicbrainz = MusicBrainzClient.new
end

# After:
def initialize(discogs: DiscogsClient.new, musicbrainz: MusicBrainzClient.new)
  @discogs = discogs
  @musicbrainz = musicbrainz
end
```

- Client specs: pass connection doubles via constructor instead of `instance_variable_set(:@connection, ...)`. Add optional `connection:` parameter to `DiscogsClient#initialize` that skips the default connection builder when provided. For `MusicBrainzClient`, use two parameters (`search_conn:` and `caa_conn:`) since it maintains separate search and cover-art connections.
- Rate limit middleware spec: pass the connection via the same mechanism.
- All existing callers that don't pass arguments continue to work via defaults.

**Patterns to follow:**
- `DiscogsSellerLookup.new(username, client: DiscogsClient.new)` for constructor injection with defaults

**Test scenarios:**
- Happy path: `StoreSyncService.new(store, client: fake_client)` uses the injected client
- Happy path: `EnrichmentService.new(discogs: fake_discogs, musicbrainz: fake_musicbrainz)` uses both injected clients
- Edge case: No args passed — defaults are used (existing behavior preserved)
- Spec: `DiscogsClient` accepts `connection:` via constructor and uses it instead of building a default
- Spec: Rate limit middleware receives connection via constructor, eliminating `instance_variable_set`

**Verification:**
- All existing service specs pass without stubbing `DiscogsClient.new` or `MusicBrainzClient.new` at the class level
- `grep -rn "instance_variable_set.*@connection\|instance_variable_set.*@search_conn\|instance_variable_set.*@caa_conn" spec/` returns nothing

---

### U2. Decompose ListingReconciler#call

**Goal:** Reduce `StoreSync::ListingReconciler#call` from 47 lines to at most 5 lines per method by extracting named private methods for each pipeline stage.

**Requirements:** R2

**Dependencies:** U1 (for test injection, but not a hard dependency)

**Files:**
- Modify: `app/services/store_sync/listing_reconciler.rb`
- Modify: `spec/services/store_sync/listing_reconciler_spec.rb`

**Approach:**
- Extract these private methods from the current `#call` body:
  - `normalized_records` — maps fetched_listings through @normalizer
  - `existing_records_map` — builds lookup from discogs_listing_id
  - `records_to_upsert` — selects records that are new or materially changed
  - `perform_upsert(records)` — calls upsert_all and returns updated IDs
  - `enrichment_ids(existing_ids, upserted_ids)` — combines new + materially changed IDs
- Each extracted method is ≤5 lines
- `#call` becomes:
  ```ruby
  def call
    records = normalized_records
    return Result.new(listing_ids_for_enrichment: []) if records.empty?

    existing = existing_records_map
    upserted = perform_upsert(records_to_upsert(records, existing))

    Result.new(listing_ids_for_enrichment: enrichment_ids(existing.keys, upserted))
  end
  ```

**Patterns to follow:**
- `StoreSync::InventoryFetcher` for single-responsibility extraction with clear method boundaries

**Test scenarios:**
- Happy path: reconciler returns listing_ids_for_enrichment for new records
- Happy path: reconciler returns listing_ids_for_enrichment for materially changed records
- Edge case: all incoming records match existing (no material changes) — empty enrichment list
- Edge case: empty fetched_listings — returns empty result, no DB writes
- Characterization: reconciler produces identical results for a known set of fetched_listings and existing listings

**Verification:**
- `#call` body is ≤5 lines
- All private methods are ≤5 lines
- Existing reconciler spec passes

---

### U3. Decompose ListingNormalizer#call

**Goal:** Reduce `StoreSync::ListingNormalizer#call` from 30 lines to at most 5 lines per method by extracting per-field extractors.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `app/services/store_sync/listing_normalizer.rb`
- Modify: `spec/services/store_sync/listing_normalizer_spec.rb`

**Approach:**
- Extract each field extraction into a named private method:
  - `normalized_genres(raw)` — array genre extraction with first-genre fallback
  - `normalized_price(raw)` — price parsing
  - `normalized_condition(raw)` — condition string normalization
  - `normalized_format(raw)` — format + media parsing
  - `normalized_notes(raw)` — notes extraction with MusicBrainz ID
  - `determine_media(format_info)` — vinyl? classifier logic
- `#call` becomes a pipeline that builds the hash from extracted methods
- The `vinyl?` method (currently 9 lines) is extracted into a separate `VinylClassifier` or kept as a private method with its own extractors
- The `rescue` block wraps each extraction independently rather than the entire block, so a failure in one field doesn't mask which field failed

**Patterns to follow:**
- Small private methods with clear names that explain what each field extraction does

**Test scenarios:**
- Happy path: full Discogs API response → complete normalized hash
- Happy path: minimal response with only required fields → partial hash with nil optionals
- Edge case: nil genre/style arrays → `["Unknown"]` fallback
- Edge case: nil price → nil in normalized hash
- Edge case: format without "Vinyl" in name → media: "Other"
- Edge case: format includes "Cassette" → media: "Other" (not vinyl)
- Error path: single field extraction fails → that field is nil, other fields still populated (rescue per field)
- Integration: normalization produces same output as before

**Verification:**
- `#call` body is ≤5 lines
- Each field extractor is ≤5 lines
- Existing normalizer spec passes
- End-to-end sync with known Discogs data produces identical results

---

### U4. Split CrateStrategies into Separate Files

**Goal:** Move each of the four crate strategy classes into its own file under `app/services/crate_strategies/`.

**Requirements:** R4

**Dependencies:** None (mechanical, zero behavior change)

**Files:**
- Create: `app/services/crate_strategies/picks.rb`
- Create: `app/services/crate_strategies/new_arrivals.rb`
- Create: `app/services/crate_strategies/thematic.rb`
- Create: `app/services/crate_strategies/hidden_gems.rb`
- Delete: `app/services/crate_strategies.rb`

**Approach:**
- Move each class to its own file under `app/services/crate_strategies/`
- Ensure each class is wrapped in the `CrateStrategies` module:
  ```ruby
  # app/services/crate_strategies/picks.rb
  class CrateStrategies::Picks
    # ... existing code
  end
  ```
- Rails autoloading resolves `CrateStrategies::Picks` from `app/services/crate_strategies/picks.rb` automatically
- Create per-strategy spec files:
  - `spec/services/crate_strategies/picks_spec.rb`
  - `spec/services/crate_strategies/new_arrivals_spec.rb`
  - `spec/services/crate_strategies/thematic_spec.rb`
  - `spec/services/crate_strategies/hidden_gems_spec.rb`
- Move `require "digest/md5"` into `app/services/crate_strategies/thematic.rb` (existing `crate_strategies.rb` has this require and `CrateStrategies::Thematic` uses `Digest::MD5.hexdigest`)

**Patterns to follow:**
- `app/services/score_strategies/` with per-strategy files

**Test scenarios:**
- Happy path: `CrateStrategies::Picks.new(...).select(...)` works as before
- Happy path: `CrateStrategies::Thematic.new(...).select(...)` works as before
- Edge case: Rails autoloading resolves all four strategy classes without errors
- Characterization: each strategy produces identical output for the same inputs as before

**Verification:**
- All strategy specs pass
- `CrateStrategies` constant still resolves (module is autoloaded from `app/services/crate_strategies/`)
- `grep -rn "class CrateStrategies" app/services/crate_strategies*.rb` shows the expected split
- StorefrontCuration and any other callers work without changes

---

### U5. Extract DiscogsSignupAvailability Use-Case Object

**Goal:** Move the 4-branch response logic from `Admin::DiscogsLookupsController#show` into a dedicated use-case object.

**Requirements:** R5

**Dependencies:** None

**Files:**
- Create: `app/services/admin/discogs_signup_availability.rb`
- Modify: `app/controllers/admin/discogs_lookups_controller.rb`
- Create: `spec/services/admin/discogs_signup_availability_spec.rb`
- Modify: `spec/requests/admin/discogs_lookups_spec.rb`

**Approach:**
- Create `Admin::DiscogsSignupAvailability` that accepts `username` and optional `discogs_lookup` and `cache` collaborators (injectable for testing)
- It returns a result struct with `status` (creatable/already_active/existing_applicant/invalid/lookup_error) and associated data
- The controller becomes:
  ```ruby
  def show
    result = Admin::DiscogsSignupAvailability.new(params[:username]).call
    render json: result, status: :ok
  end
  ```
- Preserve the exact JSON response shape from each branch (the response methods move into the service object or a dedicated serializer)
- Apply guard-parity audit: verify every precondition from the original controller exists in the extracted service

**Patterns to follow:**
- `DiscogsSellerLookup` for service with cache, validation, and multiple response paths
- `TurnstileVerifier` for small external boundary

**Test scenarios:**
- Happy path: username not found in Store or Waitlist → `{ status: "creatable", ... }`
- Happy path: username not found in Discogs → `{ status: "invalid", reason: "invalid_slug" }`
- Happy path: username exists in Store → `{ status: "already_active", store: { ... } }`
- Happy path: username exists in Waitlist → `{ status: "existing_applicant", applicant: { ... } }`
- Edge case: Discogs API error → `{ status: "lookup_error", reason: "api_error" }`
- Integration: controller returns the same JSON as before for all 4 branches

**Verification:**
- Controller `#show` is ≤5 lines (params extraction + service call + render)
- Service spec covers all 4 response branches + API error
- Request spec proves JSON parity

---

### U6. Extract OnboardingExistence Checks and De-duplicate Guards

**Goal:** Decompose `Admin::OnboardingsController#direct` and remove duplicate guards shared with `#create`.

**Requirements:** R6

**Dependencies:** None

**Files:**
- Create: `app/services/admin/store_onboarding_checks.rb`
- Modify: `app/controllers/admin/onboardings_controller.rb`
- Create: `spec/services/admin/store_onboarding_checks_spec.rb`
- Modify: `spec/requests/admin/onboardings_spec.rb`

**Approach:**
- Create `Admin::StoreOnboardingChecks` that accepts a `discogs_username` and encapsulates:
  - `blank?` — checks blank username
  - `store_exists?` — checks `Store.with_discogs_username`
  - `applicant_exists?` — checks `Waitlist.with_discogs_username`
  - Returns a result with `valid?`, `error_message`, and the conflicting record if any
- Both `#create` and `#direct` delegate their guard clauses to this object
- Remove the duplicate `Store.with_discogs_username` and `Waitlist.with_discogs_username` checks
- `#direct` becomes:
  ```ruby
  def direct
    checks = Admin::StoreOnboardingChecks.new(params[:discogs_username])
    if checks.invalid?
      redirect_to admin_path, alert: checks.error_message
      return
    end
    result = StoreOnboarding.call(discogs_username: checks.normalized_username, waitlist: nil)
    redirect_to admin_path, notice: "Onboarding queued for #{result.store.name}"
  rescue StoreOnboarding::Error => error
    redirect_to admin_path, alert: error.message
  end
  ```
- `#create` similarly delegates guard checks, then calls with the real waitlist

**Patterns to follow:**
- `DiscogsSellerLookup#plausible_username?` for validation pattern

**Test scenarios:**
- Happy path: valid username with no existing records → `valid?` true
- Edge case: blank username → `valid?` false, appropriate error
- Edge case: existing store → `valid?` false, "Store already exists"
- Edge case: existing applicant → `valid?` false, appropriate error
- Integration: controller behavior is identical for all guard paths
- Guard-parity audit: verify every precondition from the original `#direct` and `#create` is preserved

**Verification:**
- Both `#create` and `#direct` are ≤8 implementation lines
- Existing request specs pass without modification
- Service spec covers all guard conditions

---

### U7. Extract WaitlistRegistration Service

**Goal:** Decompose `WaitlistsController#create` by extracting turnstile verification, waitlist creation, and email dispatch into a `WaitlistRegistration` service.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Create: `app/services/waitlist_registration.rb`
- Modify: `app/controllers/waitlists_controller.rb`
- Modify: `app/mailers/seller_mailer.rb` (if email dispatch moves)
- Create: `spec/services/waitlist_registration_spec.rb`
- Modify: `spec/requests/waitlists_spec.rb`

**Approach:**
- Create `WaitlistRegistration` that accepts `params` and optional `turnstile_verifier:` collaborator
- It handles: turnstile verification, Waitlist creation (with error handling), email dispatch (`SellerMailer.confirmation` and `SellerMailer.admin_notification`)
- Returns a result with `success?`, `waitlist` (on success), and `errors` (on failure)
- The controller becomes:
  ```ruby
  def create
    result = WaitlistRegistration.new(waitlist_params).call
    if result.success?
      redirect_to root_path, notice: "You're on the list!"
    else
      @waitlist = result.waitlist || Waitlist.new(waitlist_params)
      render inertia: "waitlists/new", props: { ... }
    end
  end
  ```
- `SellerMailer` is called inside the service — this is an acceptable cross-layer call for a domain event notification; extract only if a second notification channel emerges later

**Patterns to follow:**
- `TurnstileVerifier` for the turnstile boundary
- `StoreOnboarding` for service-with-result pattern

**Test scenarios:**
- Happy path: valid params + turnstile pass → creates Waitlist, sends both emails
- Edge case: invalid params (missing name/email) → `success?` false, validation errors returned
- Edge case: turnstile failure → `success?` false, appropriate error
- Integration: controller returns same response as before for all paths

**Verification:**
- Controller `#create` is ≤8 lines (params extraction + service call + redirect/render)
- Service spec covers creation, validation, turnstile, and email dispatch
- Request spec proves JSON/redirect parity

---

### U8. Clean Up Admin::BaseController Credential Duplication

**Goal:** Eliminate the duplicated credential-lookup pattern in `Admin::BaseController#http_basic_auth_admin`.

**Requirements:** R8

**Dependencies:** None

**Files:**
- Modify: `app/controllers/admin/base_controller.rb`
- Modify: `spec/requests/admin/*_spec.rb` (for repeated auth_headers — see U12)

**Approach:**
- Extract a private `admin_credential(name)` helper:
  ```ruby
  def admin_credential(name)
    ENV["ADMIN_HTTP_BASIC_#{name.upcase}"].presence ||
      Rails.application.credentials.dig(:admin, :"http_basic_auth_#{name}").presence
  end
  ```
- Replace both `creds_user` and `creds_pass` lines:
  ```ruby
  creds_user = admin_credential("user")
  creds_pass = admin_credential("password")
  ```
- This also makes adding a third credential source a one-line change

**Test scenarios:**
- Happy path: ENV vars set → uses ENV values
- Happy path: ENV vars absent → uses Rails credentials
- Edge case: both ENV and credentials absent → `authenticate_with_http_basic` returns nil/401

**Verification:**
- All admin request specs pass
- `grep -rn "ENV\[\"ADMIN_HTTP_BASIC" app/` returns only the helper line (or zero if fully replaced)

---

### U9. Decompose CratePresenter#listing_props

**Goal:** Reduce `CratePresenter#listing_props` from 20 lines by extracting field-grouping private methods.

**Requirements:** R9

**Dependencies:** None

**Files:**
- Modify: `app/presenters/crate_presenter.rb`
- Modify: `spec/presenters/crate_presenter_spec.rb`

**Approach:**
- Split the 19-field hash generation into private methods:
  - `base_listing_props(listing)` — id, artist, title, label, year, condition, price
  - `media_listing_props(listing)` — format, media, cover_image_url, thumbnail_url
  - `enrichment_listing_props(listing)` — genres, styles, have_count, want_count, discogs_url, release_url
  - `display_listing_props(listing)` — display_price, want_have_ratio, sort_key
- `#listing_props` becomes:
  ```ruby
  def listing_props(listing)
    base_listing_props(listing)
      .merge(media_listing_props(listing))
      .merge(enrichment_listing_props(listing))
      .merge(display_listing_props(listing))
  end
  ```
- Each extracted method is ≤5 lines
- WantHaveRatio computation (already extracted as a Value Object from the models refactor) is used where applicable

**Patterns to follow:**
- Small private methods grouped by concern, similar to the field-extraction pattern in U3

**Test scenarios:**
- Happy path: `listing_props` returns the same 19-field hash as before
- Edge case: listing with nil enrichment fields (no genres, no price) — partial props hash
- Integration: `store_props` → `crates` → `listing_props` chain produces correct Inertia props

**Verification:**
- `#listing_props` is ≤5 lines
- Each extracted private method is ≤5 lines
- Existing presenter spec passes without modification (verify by running it)
- Frontend store page renders correctly

---

### U10. Decompose MarketingPreviewPresenter

**Goal:** Reduce `MarketingPreviewPresenter#preview_data` (11 lines with rescue) and `#cap_sections` (13 lines with type-checking).

**Requirements:** R10

**Dependencies:** None

**Files:**
- Modify: `app/presenters/marketing_preview_presenter.rb`
- Modify: `spec/presenters/marketing_preview_presenter_spec.rb`

**Approach:**

*For `#preview_data`:*
- Extract:
  - `live_preview(store)` — the private store path (with curation cache)
  - `fallback_preview` — the public unsigned path
  - `store_check(store)` — returns the store or falls back
- Remove the `rescue` around three execution paths by checking preconditions before branching:
  ```ruby
  def preview_data
    return fallback_preview unless (store = store_check(params[:store]))
    live_preview(store)
  end
  ```

*For `#cap_sections`:*
- Replace the `section[:crate]` vs `section[:crates]` type-checking with a `sections_cap` that delegates to each section's own cap method (polymorphism via `respond_to?` or a uniform section interface)
- If sections don't share a common interface, extract a `cap_single_crate_section(section)` and `cap_multi_crate_section(section)` with a dispatch:
  ```ruby
  def cap_sections(sections)
    sections.map { |section| section.key?(:crates) ? cap_multi_crate_section(section) : cap_single_crate_section(section) }
  end
  ```

**Patterns to follow:**
- `CratePresenter#build_storefront_sections` for section hash structure

**Test scenarios:**
- Happy path: `preview_data` for authorized store returns live curation
- Happy path: `preview_data` for unauthorized store returns fallback preview
- Edge case: store lookup raises — method returns fallback gracefully (no rescue wrapping unrelated code)
- Happy path: `cap_sections` caps single-crate and multi-crate sections correctly
- Edge case: empty sections array → empty result

**Verification:**
- `#preview_data` is ≤5 lines (condition + fallback guard)
- `#cap_sections` is ≤5 lines (delegation only)
- Existing preview presenter specs pass

---

### U11. Fix Spec: Eliminate Private Method Testing via `send`

**Goal:** Replace all `send(:private_method_name)` calls with tests through the public interface. Test behavior, not implementation.

**Requirements:** R11

**Dependencies:** U1 (for EnrichmentService injection), U3 (for ListingNormalizer extraction), U9 (for CratePresenter extraction)

**Files:**
- Modify: `spec/presenters/crate_presenter_spec.rb` (6 send calls)
- Modify: `spec/services/daily_selection_service_spec.rb` (7 send calls)

**Approach:**

*CratePresenter spec:*
- Instead of `described_class.new(fake_store).send(:listing_props, listing)`, test through the public methods that exercise `listing_props`:
  - `#build_crates` returns crate objects whose `records` array contains the listing data
  - `#store_props` returns the store hash with correct listing data
- If there's a specific field transformation that needs isolated testing, extract it to a public method or value object

*DailySelectionService spec:*
- Instead of `service.send(:score_listings, ...)`, test through `#generate` and verify the selection contains expected listings with expected scores
- If score assertions need to be precise, make the scores observable through a public interface (e.g., an optional debug output or a public method on the selection result)

**Patterns to follow:**
- Existing specs that test through public interfaces (e.g., `RecordScorer` specs that call `#score` and `#score_breakdown`)

**Test scenarios:**
- Happy path: CratePresenter `#build_crates` returns listing data matching expected structure
- Happy path: DailySelectionService `#generate` produces selections that reflect scoring correctly
- Edge case: each removed `send` call has a corresponding behavioral assertion through a public method

**Verification:**
- `grep -rn "\.send(:" spec/` returns zero for the fixed spec files
- All assertion coverage from the removed `send` tests is preserved through public interfaces

---

### U12. Fix Spec: Extract Repeated Helpers

**Goal:** Extract the `def listing(...)` helper duplicated across 10 score strategy specs and the `auth_headers` helper duplicated across 3 request specs into shared support modules.

**Requirements:** R12

**Dependencies:** None (independent)

**Files:**
- Create: `spec/support/listing_helpers.rb`
- Create: `spec/support/admin_auth_helpers.rb`
- Modify: (all 10 score strategy spec files with duplicated `def listing(...)`)
- Modify: (3 admin request spec files with duplicated `auth_headers`)

**Approach:**

*Listing helper:*
```ruby
# spec/support/listing_helpers.rb
module ListingHelpers
  def build_listing(overrides = {})
    defaults = { condition: "Mint", genres: ["Rock"], price: 10.0 }
    build_stubbed(:listing, **defaults.merge(overrides))
  end
end

RSpec.configure do |config|
  config.include ListingHelpers, type: :service
end
```

*Auth headers helper:*
```ruby
# spec/support/admin_auth_helpers.rb
module AdminAuthHelpers
  def auth_headers(username, password)
    credentials = Base64.strict_encode64("#{username}:#{password}")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end
end
```

- Remove the duplicate `def listing(...)` from each score strategy spec
- Remove the duplicate `auth_headers` and `around` blocks from admin request specs
- Keep overrides inline: `build_listing(genre: ["Electronic"])` where specific fields differ

**Test scenarios:**
- Happy path: `build_listing` returns a `Listing` stubbed with default attributes
- Happy path: `build_listing(condition: "Poor")` overrides the default condition
- Happy path: `auth_headers("user", "pass")` returns valid Basic auth hash
- Integration: all affected spec files pass with shared helpers

**Verification:**
- `grep -rn "def listing(" spec/` returns zero (or only legitimate non-duplicated definitions)
- `grep -rn "def auth_headers" spec/` returns zero

---

### U13. Fix Spec: Replace Arel Introspection with Behavioral Test

**Goal:** Replace the Arel AST traversal helper in `listing_spec.rb` with a behavioral test that verifies the `daily_shuffle` scope returns correct results.

**Requirements:** R16

**Dependencies:** None

**Files:**
- Modify: `spec/models/listing_spec.rb`

**Approach:**
- Remove the `arel_nodes` helper that traverses Arel internals via `instance_variables` / `instance_variable_get`
- Replace with a test that verifies the scope's SQL output is safe (uses bound parameters, no string interpolation) — check the `to_sql` output for `$N` parameterized placeholders or verify via an actual database query
- Alternatively, test that the scope returns expected listings when run against real fixture data

**Patterns to follow:**
- Existing scope tests in the codebase that test behavior (e.g., `Store.with_discogs_username` specs)

**Test scenarios:**
- Happy path: `Listing.daily_shuffle` returns listings ordered by MD5 hash of `Date.current` + `listing.id`
- Edge case: scope returns all listings (no unexpected exclusions)
- Safety: `Listing.daily_shuffle.to_sql` contains no interpolated raw strings (uses bound parameters)

**Verification:**
- No `instance_variables` or `instance_variable_get` calls in specs
- Scope produces same results as before for a given set of fixture listings

---

### U14. Fix Spec: Reduce Excessive Mocking in DailyCurationService Spec

**Goal:** Reduce the 7 `let` blocks + 3 stubs + 2 `instance_double` calls in the `DailyCurationService` spec by testing through fewer layers of indirection.

**Requirements:** R15

**Dependencies:** None (but benefits from U1's injectable dependencies)

**Files:**
- Modify: `spec/services/daily_curation_service_spec.rb`

**Approach:**
- The spec currently mocks `StorefrontCuration` and `CratePresenter` to verify `DailyCurationService#curate` calls them correctly. Instead, test the service with real collaborators (or near-real) and verify the outcome: listings have updated `last_surfaced_at` and incremented `surface_count`.
- If mocking is needed, use a single spy on `StorefrontCuration` rather than a fully stubbed `instance_double` with 4 stubs.
- Reduce `let` blocks by inlining data that's only used once.

**Patterns to follow:**
- `FullStoreSyncJob` spec that mocks the service at the job level but tests the service with real collaborator output

**Test scenarios:**
- Happy path: `DailyCurationService#curate` updates surfaced listings with new `last_surfaced_at` timestamp
- Happy path: `DailyCurationService#curate` increments `surface_count` for surfaced listings
- Edge case: store with no storefront → no updates, no errors
- Job level: `DailyCurationJob` calls the service with the correct store

**Verification:**
- Spec passes with fewer than 5 `let` blocks
- No `instance_double` for `StorefrontCuration` or `CratePresenter` (use spies or real objects)
- Coverage of `last_surfaced_at` and `surface_count` updates is preserved

---

### U15. Fix Spec: Replace Sleep Stubbing with Observable Timing Tests

**Goal:** Stop stubbing `sleep` in `discogs_rate_limit_middleware_spec.rb` and instead verify rate-limiting behavior through observable outcomes.

**Requirements:** R14

**Dependencies:** U1 (for injectable connection) — but can be done independently with minimal changes

**Files:**
- Modify: `spec/services/discogs_rate_limit_middleware_spec.rb`

**Approach:**
- Replace `allow(middleware).to receive(:sleep)` stubs with behavioral assertions about observable middleware outcomes:
  - After a 429 response, the middleware retries the request up to MAX_RETRIES times (verify the `app.call` count)
  - When all retries are exhausted, the middleware returns the 429 response status
  - The middleware correctly tracks rate-limit state (remaining calls, reset time) across a sequence of requests
- The retry-exhaustion test (lines 111-119 of the current spec) already verifies behavior through observable outcomes — extend that pattern to the remaining examples. Drop `allow(middleware).to receive(:sleep)` lines from examples that only need them as noise suppression (they're not asserting on sleep arguments).
- No new production abstractions (Clock module, constructor parameter) needed — the existing retry-count and response-status assertions already prove the middleware works correctly without exposing its internal timing mechanism.

**Patterns to follow:**
- The existing retry-exhaustion spec (lines 111-119) which proves behavior through observable retry count and response status

**Test scenarios:**
- Happy path: 429 response triggers retry up to MAX_RETRIES, observable via `app.call` count
- Happy path: successful response does not trigger retry
- Edge case: all retries exhausted — middleware returns the 429 status
- Integration: middleware correctly limits request rate across a sequence of calls (verified through response patterns, not stubbed sleep)

**Verification:**
- `grep -rn "receive(:sleep)" spec/services/discogs_rate_limit_middleware_spec.rb` returns zero
- All rate-limit behavior is verified through observable outcomes (retry count, response status, timing between calls through Faraday test doubles)

---

## System-Wide Impact

- **Interaction graph:** No new entry points. Controller extraction (U5-U7) changes internal delegation but preserves request shapes. Service injection (U1) changes constructor signatures but preserves all public method interfaces.
- **Error propagation:** U5-U7 preserve existing error-handling behavior — exceptions from services still result in appropriate error responses. The rescue in `MarketingPreviewPresenter#preview_data` becomes more precise, catching only the store-lookup failure rather than wrapping three unrelated code paths.
- **State lifecycle risks:** No new database writes. U6's guard extraction only reads existing data.
- **API surface parity:** No JSON, Inertia prop, route, or frontend prop changes.
- **Integration coverage:** Controller request specs remain the primary parity guard. No cross-layer concerns beyond what's covered by existing request specs.
- **Unchanged invariants:** All existing public method signatures remain callable (constructor changes use keyword defaults). All internal refactors preserve behavior.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Controller extraction changes JSON response shape | Run existing request specs before and after; they prove exact JSON parity |
| CrateStrategies file split breaks autoloading | Verify with `Rails.application.eager_load!` in a test or console |
| Spec refactors lose coverage | `grep` for removed assertions and verify equivalent behavioral assertions exist in their place |
| Sleep-stubbing replacement increases test runtime | Clock-injection pattern adds no real-time delay — test doubles record calls without sleeping |
| U5-U7 service objects become another bag of services | Each is scoped to one use case and named after the business behavior it owns (SignupAvailability, OnboardingChecks, Registration) |

---

## Sources & References

- **Sandi Metz review outputs:** `sandi-metz-data-layer.md`, `sandi-metz-business-logic.md`, `sandi-metz-interface-layer.md`, `sandi-metz-specs.md`, `sandi-metz-config.md`, `sandi-metz-analysis.md`
- **Completed models refactor:** `docs/plans/2026-05-19-002-refactor-models-sandi-metz-plan.md`
- **Completed layered architecture:** `docs/plans/2026-05-13-002-refactor-layered-architecture-plan.md`
- **Completed layered follow-up:** `docs/plans/2026-05-17-001-refactor-layered-audit-follow-up-plan.md`
- **Completed curation cache:** `docs/plans/2026-05-21-storefront-curation-cache-plan.md`
- **Institutional learning:** `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`
- **Institutional learning:** `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`
