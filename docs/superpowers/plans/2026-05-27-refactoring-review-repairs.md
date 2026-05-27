# Refactoring Review Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the behavior, ownership, and public-protocol regressions introduced by the Sandi Metz refactoring branch.

**Architecture:** Preserve the branch's existing Rails application/service boundaries while restoring each object's single public responsibility. Storefront strategies keep call-specific policy state local; OAuth services return stable application results; jobs delegate persisted lifecycle state to existing collaborators; controllers publish only routed actions.

**Tech Stack:** Ruby 3.x, Rails 8.1, RSpec, Active Job, RuboCop

---

## File Map

| Responsibility | Production Files | Test Files |
| --- | --- | --- |
| Storefront featured crate assembly and picks policy | `app/services/storefront_curation.rb`, `app/services/crate_strategies/picks.rb`, `app/services/crate_strategies/thematic.rb` | `spec/services/storefront_curation_spec.rb`, `spec/services/crate_strategies/picks_spec.rb` |
| Store-owner OAuth initiation and callback rejection | `app/services/authorize_store_service.rb`, `app/services/auth_callback_service.rb` | `spec/requests/oauth_flow_spec.rb`, `spec/services/application_operation_visibility_spec.rb` |
| Store sync lifecycle and enrichment failure identity | `app/jobs/full_store_sync_job.rb`, `app/jobs/enrichment_job.rb` | `spec/jobs/full_store_sync_job_spec.rb`, `spec/jobs/enrichment_job_spec.rb` |
| Experiment count semantics and onboarding conflict reuse | `app/services/experiments/seed_generator.rb`, `app/services/admin/store_onboarding_checks.rb` | `spec/services/experiments/seed_generator_spec.rb`, `spec/services/admin/store_onboarding_checks_spec.rb`, `spec/services/application_operation_visibility_spec.rb` |
| Controller action surface | `app/controllers/admin/sessions_controller.rb`, `app/controllers/admin/totp_controller.rb`, `app/controllers/dev_controller.rb`, `app/controllers/pile_controller.rb`, `app/controllers/shopper_auth_controller.rb`, `app/controllers/stores_controller.rb`, `app/controllers/waitlists_controller.rb` | `spec/controllers/controller_action_visibility_spec.rb` |

## Authorized Existing Edit

`app/controllers/pile_controller.rb` already has an unstaged guard-clause
improvement replacing a combined final conditional with two early returns. The
user authorized incorporating that change. Retain it as part of Task 5 because
it matches the repository guard-clause convention and belongs with the
controller protocol cleanup.

### Task 1: Restore Storefront Crate Behavior And Picks Policy

**Files:**
- Modify: `spec/services/storefront_curation_spec.rb`
- Create: `spec/services/crate_strategies/picks_spec.rb`
- Modify: `app/services/storefront_curation.rb`
- Modify: `app/services/crate_strategies/picks.rb`
- Modify: `app/services/crate_strategies/thematic.rb`

- [ ] **Step 1: Add a failing storefront regression example**

Add this example inside `describe "#storefront_groups"` in `spec/services/storefront_curation_spec.rb`:

```ruby
    it "includes a viable hidden gems crate in the featured group" do
      store = create(:store)
      gems = lp_listings(store, count: 4, genres: [ "Jazz" ], styles: [ "Rare Groove" ])
      curation = described_class.new(store)

      allow(curation).to receive(:picks_strategy)
        .and_return(instance_double(CrateStrategies::Picks, select: []))
      allow(curation).to receive(:new_arrivals_strategy)
        .and_return(instance_double(CrateStrategies::NewArrivals, select: []))
      allow(curation).to receive(:thematic_strategy)
        .and_return(instance_double(CrateStrategies::Thematic, select: nil))
      allow(curation).to receive(:hidden_gems_strategy)
        .and_return(instance_double(CrateStrategies::HiddenGems, select: gems))

      featured = curation.storefront_groups.fetch(:featured)

      expect(featured.map(&:slug)).to eq([ "hidden-gems" ])
      expect(featured.first.listings).to eq(gems)
    end
```

- [ ] **Step 2: Add failing strategy examples for count-specific and nil-genre diversity**

Create `spec/services/crate_strategies/picks_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe CrateStrategies::Picks do
  subject(:strategy) { described_class.new(genre_counts: {}, today: Date.new(2026, 5, 27)) }

  let(:scorer) { instance_double(RecordScorer, score: 10) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
  end

  def listing(id, genre)
    instance_double(Listing, id:, primary_genre: genre)
  end

  it "derives its genre cap from the requested count" do
    pool = [ listing(1, "Jazz"), listing(2, "Jazz"), listing(3, "Jazz") ]

    selected = strategy.select(pool, excluded_ids: Set.new, count: 3)

    expect(selected.size).to eq(2)
  end

  it "applies its genre cap to listings without a primary genre" do
    pool = [ listing(1, nil), listing(2, nil), listing(3, nil) ]

    selected = strategy.select(pool, excluded_ids: Set.new, count: 3)

    expect(selected.size).to eq(2)
  end
end
```

- [ ] **Step 3: Run the new examples and verify the reviewed code fails**

Run:

```bash
bundle exec rspec spec/services/storefront_curation_spec.rb spec/services/crate_strategies/picks_spec.rb
```

Expected: FAIL because `hidden-gems` is absent and the nil-genre Picks example returns three listings.

- [ ] **Step 4: Restore featured-crate assembly and local Picks state**

Update `StorefrontCuration#build_featured_crates` and its repaired guard-oriented helpers:

```ruby
  def build_featured_crates(excluded_ids:)
    seen = excluded_ids.dup
    crates = add_crate(seen, build_new_arrivals_crate(excluded_ids: seen))
    crates += add_crate(seen, build_thematic_crate(excluded_ids: seen))
    crates += add_crate(seen, build_hidden_gems_crate(excluded_ids: seen))
    crates
  end

  def viable_crate(slug:, name:, listings:, size: CuratedCrate::CRATE_SIZE)
    capped = listings.first(size)
    crate = CuratedCrate.new(slug:, name:, listings: capped)
    return unless crate.viable?

    crate
  end

  def build_and_track(genre, listings, seen_ids)
    crate = CuratedCrate.new(slug: genre.parameterize, name: genre, listings:)
    return unless crate.viable?

    seen_ids.merge(listings.map(&:id))
    crate
  end

  def build_hidden_gems_crate(excluded_ids:)
    listings = hidden_gems_strategy.select(eligible_listings, excluded_ids:)
    return if listings.empty?

    viable_crate(slug: "hidden-gems", name: "Hidden Gems", listings:)
  end
```

Replace the Picks selection helpers so only `select` is public and all per-call state is local:

```ruby
    def select(pool, excluded_ids:, count: 12)
      scored = score_pool(pool, excluded_ids:)
      select_by_diversity(scored, count:)
    end

    private

    def score_pool(pool, excluded_ids:)
      pool
        .reject { |listing| excluded_ids.include?(listing.id) }
        .map { |listing| [ listing, @scorer.score(listing) ] }
    end

    def select_by_diversity(scored, count:)
      genre_cap = @policy.genre_cap(count)
      genre_seen = Hash.new(0)

      score_sorter(scored)
        .filter_map { |listing, _| apply_genre_cap(listing, genre_cap:, genre_seen:) }
        .uniq(&:id)
        .first(count)
    end

    def score_sorter(scored)
      shuffle_seed = @today.to_s.sum
      scored.sort_by { |listing, score| @policy.sort_key(listing, score, shuffle_seed) }
    end

    def apply_genre_cap(listing, genre_cap:, genre_seen:)
      genre = listing.primary_genre
      return if genre_seen[genre] >= genre_cap

      genre_seen[genre] += 1
      listing
    end
```

Replace `CrateStrategies::Thematic#best_theme` with:

```ruby
    def best_theme(candidates)
      themes = discover_themes(candidates)
      return if themes.empty?

      themes[seed % themes.size]
    end
```

- [ ] **Step 5: Run focused specs and commit**

Run:

```bash
bundle exec rspec spec/services/storefront_curation_spec.rb spec/services/crate_strategies/picks_spec.rb spec/services/pick_policy_spec.rb
bundle exec rubocop app/services/storefront_curation.rb app/services/crate_strategies/picks.rb app/services/crate_strategies/thematic.rb spec/services/storefront_curation_spec.rb spec/services/crate_strategies/picks_spec.rb
```

Expected: PASS and no offenses.

Commit:

```bash
git add app/services/storefront_curation.rb app/services/crate_strategies/picks.rb app/services/crate_strategies/thematic.rb spec/services/storefront_curation_spec.rb spec/services/crate_strategies/picks_spec.rb
git commit -m "fix: restore storefront crate selection contracts"
```

### Task 2: Repair OAuth Result And Error Boundaries

**Files:**
- Modify: `spec/requests/oauth_flow_spec.rb`
- Create: `spec/services/application_operation_visibility_spec.rb`
- Modify: `app/services/authorize_store_service.rb`
- Modify: `app/services/auth_callback_service.rb`

- [ ] **Step 1: Add failing request examples for one inventory snapshot and expected identity rejection**

In the existing `"when inventory is 50"` context in `spec/requests/oauth_flow_spec.rb`, append:

```ruby
      it "checks seller inventory only once" do
        post_authorize

        expect(discogs_client).to have_received(:seller_inventory).once
      end
```

In the existing `"when identity does not match slug"` context, append:

```ruby
      it "treats identity mismatch as an expected rejection" do
        allow(Rails.logger).to receive(:error)

        get "/auth/discogs/callback", params: { oauth_verifier: "v1" }

        expect(flash[:alert]).to start_with("Discogs identity mismatch.")
        expect(flash[:alert]).not_to include("unexpected error")
        expect(Rails.logger).not_to have_received(:error)
          .with(include("[AuthCallbackService] Unexpected error"))
      end
```

- [ ] **Step 2: Add a failing public-protocol spec for repaired application operations**

Create `spec/services/application_operation_visibility_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "application operation public protocols" do
  it "keeps store authorization orchestration internal" do
    expect(AuthorizeStoreService.public_instance_methods(false)).to contain_exactly(:call)
  end

  it "keeps OAuth callback orchestration internal" do
    expect(AuthCallbackService.public_instance_methods(false)).to contain_exactly(:call)
  end
end
```

- [ ] **Step 3: Run only OAuth and applicable protocol examples to verify failure**

Run:

```bash
bundle exec rspec spec/requests/oauth_flow_spec.rb spec/services/application_operation_visibility_spec.rb:4 spec/services/application_operation_visibility_spec.rb:8
```

Expected: FAIL because inventory is fetched twice, identity mismatch reaches `unexpected_error`, and the two OAuth service classes publish helper methods.

- [ ] **Step 4: Restore single-read authorization and normal callback rejection**

Refactor `AuthorizeStoreService` so its only public instance operation is `call`:

```ruby
  def call
    total_listings = inventory_count
    return enforce_minimum_error(total_listings) if enforce_minimum_listings?(total_listings)

    request_oauth_token
  rescue DiscogsClient::ApiError, DiscogsOauthClient::OauthError => error
    oauth_error(error)
  end

  private

  def oauth_error(error)
    message = error.is_a?(DiscogsOauthClient::OauthError) ? error.message : "Could not verify this Discogs account. Please check the username and try again."
    error_result(message)
  end

  def enforce_minimum_error(_total_listings)
    error_result("We couldn't find enough inventory for this Discogs account. Milkcrate requires at least #{MINIMUM_LISTINGS} vinyl records to create a storefront.")
  end
```

Place `inventory_count` and `request_oauth_token` below that same `private` boundary; retain the existing `enforce_minimum_listings?` and `error_result` implementations.

Refactor `AuthCallbackService`:

```ruby
  def call
    perform_authorization
  rescue CallbackError => error
    error_result(error.message)
  rescue DiscogsOauthClient::OauthError => error
    oauth_error(error)
  rescue StandardError => error
    unexpected_error(error)
  end

  private

  def perform_authorization
    oauth_client = DiscogsOauthClient.new
    token_result = oauth_client.exchange_access_token(@request_token, @oauth_verifier)
    verify_identity!(oauth_client, token_result)

    finalize_authorization(token_result)
  end

  def verify_identity!(oauth_client, token_result)
    identity = oauth_client.verify_identity(token_result.access_token, token_result.access_token_secret)
    return if identity.username.downcase == @slug.downcase

    raise CallbackError, "Discogs identity mismatch. The Discogs account you authorized (#{identity.username}) does not match the store URL (#{@slug})."
  end
```

Move `finalize_authorization` below `private` with the remaining support methods.

- [ ] **Step 5: Run OAuth specs and commit**

Run:

```bash
bundle exec rspec spec/requests/oauth_flow_spec.rb spec/services/application_operation_visibility_spec.rb:4 spec/services/application_operation_visibility_spec.rb:8
bundle exec rubocop app/services/authorize_store_service.rb app/services/auth_callback_service.rb spec/requests/oauth_flow_spec.rb spec/services/application_operation_visibility_spec.rb
```

Expected: PASS and no offenses.

Commit:

```bash
git add app/services/authorize_store_service.rb app/services/auth_callback_service.rb spec/requests/oauth_flow_spec.rb spec/services/application_operation_visibility_spec.rb
git commit -m "fix: restore oauth service result boundaries"
```

### Task 3: Restore Job Diagnostic Ownership

**Files:**
- Modify: `spec/jobs/full_store_sync_job_spec.rb`
- Modify: `spec/jobs/enrichment_job_spec.rb`
- Modify: `app/jobs/full_store_sync_job.rb`
- Modify: `app/jobs/enrichment_job.rb`

- [ ] **Step 1: Strengthen the failed-sync example to require status-manager diagnostics**

Replace the failure setup and assertions in `"persists failure details when strategy raises"` in `spec/jobs/full_store_sync_job_spec.rb`:

```ruby
      it "persists failure details when strategy raises" do
        error = RuntimeError.new("discogs timeout")
        error.set_backtrace([ "app/services/sync_strategy.rb:17:in `call'" ])
        allow(mock_strategy).to receive(:call).with(store, hash_including(max_pages: nil))
          .and_raise(error)

        expect {
          described_class.perform_now(store.id)
        }.to raise_error(RuntimeError, "discogs timeout")

        store.reload
        expect(store.sync_status).to eq("failed")
        expect(store.last_sync_error).to include("RuntimeError: discogs timeout")
        expect(store.last_sync_error).to include("app/services/sync_strategy.rb:17:in `call'")
        expect(store.last_sync_error_at).to be_present
      end
```

- [ ] **Step 2: Add a failure-log example for a store already loaded by enrichment**

Append inside `describe "#perform"` in `spec/jobs/enrichment_job_spec.rb`:

```ruby
    it "logs the loaded store username when enrichment fails" do
      allow(Rails.logger).to receive(:error)
      allow(service).to receive(:enrich_store).with(store, listing_ids: nil)
        .and_raise(RuntimeError, "Discogs unavailable")

      expect {
        described_class.perform_now(store.id)
      }.to raise_error(RuntimeError, "Discogs unavailable")

      expect(Rails.logger).to have_received(:error)
        .with(include("store=#{store.discogs_username}"))
    end
```

- [ ] **Step 3: Run job specs and verify failure**

Run:

```bash
bundle exec rspec spec/jobs/full_store_sync_job_spec.rb spec/jobs/enrichment_job_spec.rb
```

Expected: FAIL because full-sync persistence omits the backtrace and enrichment logging uses the numeric store ID.

- [ ] **Step 4: Delegate failed sync persistence and retain enrichment identity**

Replace `FullStoreSyncJob#mark_failed`:

```ruby
  def mark_failed(store_id, error)
    store = Store.find_by(id: store_id)
    return unless store

    sync_manager(store).mark_failed!(error)
  end
```

Refactor `EnrichmentJob` so the rescued path has access to any store already loaded:

```ruby
  def perform(store_id, listing_ids: nil)
    store = find_store(store_id)
    run_with_progress(store, listing_ids:)
  rescue StandardError => error
    log_failure(store || store_id, error)
    raise
  end

  private

  def run_with_progress(store, listing_ids:)
    setup_progress(store)
    run_enrichment(store, listing_ids:)
    clear_progress(store)
  end
```

- [ ] **Step 5: Run job specs and commit**

Run:

```bash
bundle exec rspec spec/jobs/full_store_sync_job_spec.rb spec/jobs/enrichment_job_spec.rb
bundle exec rubocop app/jobs/full_store_sync_job.rb app/jobs/enrichment_job.rb spec/jobs/full_store_sync_job_spec.rb spec/jobs/enrichment_job_spec.rb
```

Expected: PASS and no offenses.

Commit:

```bash
git add app/jobs/full_store_sync_job.rb app/jobs/enrichment_job.rb spec/jobs/full_store_sync_job_spec.rb spec/jobs/enrichment_job_spec.rb
git commit -m "fix: preserve background job failure diagnostics"
```

### Task 4: Repair Experiment Semantics And Onboarding Query Reuse

**Files:**
- Modify: `spec/services/experiments/seed_generator_spec.rb`
- Modify: `spec/services/admin/store_onboarding_checks_spec.rb`
- Modify: `spec/services/application_operation_visibility_spec.rb`
- Modify: `app/services/experiments/seed_generator.rb`
- Modify: `app/services/admin/store_onboarding_checks.rb`

- [ ] **Step 1: Add failing experiment count examples**

Append inside `describe ".call"` in `spec/services/experiments/seed_generator_spec.rb`:

```ruby
    it "does not report crate-size truncation as previously labeled exclusions" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)
      (Settings.experiments.crate_size + 1).times do |i|
        create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "overflow-#{i}",
          artist: "Artist #{i}", year: 1972, genres: [ "Jazz" ], condition: "Near Mint",
          want_count: 100, have_count: 10,
          cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      end

      allow_any_instance_of(described_class).to receive(:previously_labeled_ids).and_return([])

      result = described_class.call(store_id: store.id, crate_name: "test-crate")

      expect(result.total_records).to eq(Settings.experiments.crate_size)
      expect(result.excluded_count).to eq(0)
    end

    it "reports previously labeled release IDs as exclusions" do
      store = create(:store, catalog_coverage: "partial", last_synced_at: 1.hour.ago)
      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "labeled",
        cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "eligible",
        cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")

      allow_any_instance_of(described_class).to receive(:previously_labeled_ids).and_return([ "labeled" ])

      result = described_class.call(store_id: store.id, crate_name: "test-crate")

      expect(result.excluded_count).to eq(1)
      expect(result.seed_data.map { |entry| entry[:discogs_release_id] }).to eq([ "eligible" ])
    end
```

- [ ] **Step 2: Add a failing onboarding retained-record example**

Append inside `describe "#call"` in `spec/services/admin/store_onboarding_checks_spec.rb`:

```ruby
    it "returns the conflict record used for the store decision without querying again" do
      existing_store = create(:store, discogs_username: "existing-store")
      checks = described_class.new("existing-store")
      allow(checks).to receive(:existing_store).and_return(existing_store, nil)

      result = checks.call

      expect(result.conflicting_record).to eq(existing_store)
end
```

- [ ] **Step 3: Add a failing public-protocol example for the seed pipeline**

Append inside `RSpec.describe "application operation public protocols"` in
`spec/services/application_operation_visibility_spec.rb`:

```ruby
  it "keeps experiment seed pipeline stages internal" do
    expect(Experiments::SeedGenerator.public_instance_methods(false)).to contain_exactly(:call)
  end
```

- [ ] **Step 4: Run service specs and the new public-protocol expectation to verify failure**

Run:

```bash
bundle exec rspec spec/services/experiments/seed_generator_spec.rb spec/services/admin/store_onboarding_checks_spec.rb spec/services/application_operation_visibility_spec.rb:12
```

Expected: FAIL because truncated records are counted as exclusions, the onboarding result requeries, and SeedGenerator exposes pipeline methods.

- [ ] **Step 5: Carry the original exclusion count and reuse captured conflicts**

Refactor the public portion of `Experiments::SeedGenerator`:

```ruby
    def call
      scored, excluded_count = fetch_and_score
      top_n = scored.sort_by { |entry| -entry[:score] }.first(crate_size)
      build_result(top_n, excluded_count)
    end

    private

    def fetch_and_score
      listings = fetch_listings
      raise Error, "No LP listings found for store #{store_id}" if listings.empty?

      excluded_ids = previously_labeled_ids
      [ filter_scored(listings, excluded_ids), excluded_ids.size ]
    end

    def build_result(top_n, excluded_count)
      seed_data = build_seed_data(top_n)
      Result.new(seed_data:, total_records: seed_data.size, excluded_count:)
    end

    def filter_scored(listings, excluded_ids)
      score_listings(listings).reject { |entry| excluded_ids.include?(entry[:listing].discogs_release_id) }
    end
```

Refactor `Admin::StoreOnboardingChecks`:

```ruby
  def call
    return blank_result if @normalized.blank?
    return conflicting_store_result(store) if (store = existing_store)
    return conflicting_applicant_result(applicant) if (applicant = existing_applicant)

    valid_result
  end

  private

  def conflicting_store_result(store)
    Result.new(valid: false, error_message: "Store already exists for #{@normalized}", conflicting_record: store, normalized_username: @normalized)
  end

  def conflicting_applicant_result(applicant)
    Result.new(valid: false, error_message: "#{@normalized} already has an applicant. Use the applicant onboarding path.", conflicting_record: applicant, normalized_username: @normalized)
  end
```

- [ ] **Step 6: Run service specs and commit**

Run:

```bash
bundle exec rspec spec/services/experiments/seed_generator_spec.rb spec/services/admin/store_onboarding_checks_spec.rb spec/services/application_operation_visibility_spec.rb
bundle exec rubocop app/services/experiments/seed_generator.rb app/services/admin/store_onboarding_checks.rb spec/services/experiments/seed_generator_spec.rb spec/services/admin/store_onboarding_checks_spec.rb spec/services/application_operation_visibility_spec.rb
```

Expected: PASS and no offenses.

Commit:

```bash
git add app/services/experiments/seed_generator.rb app/services/admin/store_onboarding_checks.rb spec/services/experiments/seed_generator_spec.rb spec/services/admin/store_onboarding_checks_spec.rb spec/services/application_operation_visibility_spec.rb
git commit -m "fix: preserve extracted service result semantics"
```

### Task 5: Keep Controller Helpers Out Of The Action Surface

**Files:**
- Create: `spec/controllers/controller_action_visibility_spec.rb`
- Modify: `app/controllers/admin/sessions_controller.rb`
- Modify: `app/controllers/admin/totp_controller.rb`
- Modify: `app/controllers/dev_controller.rb`
- Modify: `app/controllers/pile_controller.rb`
- Modify: `app/controllers/shopper_auth_controller.rb`
- Modify: `app/controllers/stores_controller.rb`
- Modify: `app/controllers/waitlists_controller.rb`

- [ ] **Step 1: Add a failing action-surface spec**

Create `spec/controllers/controller_action_visibility_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "controller action visibility" do
  {
    Admin::SessionsController => %w[authenticate_admin finalize_admin_login],
    Admin::TotpController => %w[render_invalid_totp_setup],
    DevController => %w[start_dev_session find_or_create_dev_admin],
    PileController => %w[create_wantlist find_shopper find_store render_wantlist_result],
    ShopperAuthController => %w[validate_store_slug authorize_shopper store_shopper_oauth_session clear_shopper_oauth_session],
    StoresController => %w[redirect_to_discogs store_owner_oauth_session],
    WaitlistsController => %w[redirect_on_success register_waitlist]
  }.each do |controller, helpers|
    it "keeps #{controller} support methods private" do
      expect(controller.action_methods).not_to include(*helpers)
    end
  end
end
```

- [ ] **Step 2: Run the new spec and verify it fails**

Run:

```bash
bundle exec rspec spec/controllers/controller_action_visibility_spec.rb
```

Expected: FAIL for each controller because the extracted helper methods currently appear in `action_methods`.

- [ ] **Step 3: Make helper visibility explicit**

In `Admin::SessionsController`, place `private` immediately before `authenticate_admin`, retaining `new`, `create`, and `destroy` as public actions by moving `destroy` above the private boundary:

```ruby
  def destroy
    reset_session
    redirect_to admin_login_path, notice: "Signed out."
  end

  private

  def authenticate_admin
```

In `Admin::TotpController`, move `render_invalid_totp_setup` below the existing `private` boundary.

In `DevController`, insert `private` before `start_dev_session`; `login_as` and `admin_login` remain public.

In `ShopperAuthController`, retain `authorize` and `disconnect` above a `private` boundary and place `validate_store_slug`, `authorize_shopper`, `store_shopper_oauth_session`, and `clear_shopper_oauth_session` below it.

In `StoresController`, insert `private` before `redirect_to_discogs` and remove the later redundant `private` marker.

In `WaitlistsController`, insert `private` before `redirect_on_success` and remove the later redundant `private` marker.

In `PileController`, retain the existing guard-clause improvement in
`add_to_wantlist` and add a visibility declaration at the bottom of the class:

```ruby
  private :create_wantlist, :find_shopper, :find_store, :render_wantlist_result
```

- [ ] **Step 4: Run controller visibility and affected request specs**

Run:

```bash
bundle exec rspec spec/controllers/controller_action_visibility_spec.rb spec/controllers/dev_controller_spec.rb spec/requests/oauth_flow_spec.rb spec/requests/waitlists_spec.rb spec/requests/pile_wantlist_handoffs_spec.rb
bundle exec rubocop app/controllers/admin/sessions_controller.rb app/controllers/admin/totp_controller.rb app/controllers/dev_controller.rb app/controllers/pile_controller.rb app/controllers/shopper_auth_controller.rb app/controllers/stores_controller.rb app/controllers/waitlists_controller.rb spec/controllers/controller_action_visibility_spec.rb
```

Expected: PASS and no offenses.

- [ ] **Step 5: Stage the controller repairs and commit**

Stage the controller repair files, including the authorized `PileController`
guard-clause improvement:

```bash
git add app/controllers/admin/sessions_controller.rb app/controllers/admin/totp_controller.rb app/controllers/dev_controller.rb app/controllers/pile_controller.rb app/controllers/shopper_auth_controller.rb app/controllers/stores_controller.rb app/controllers/waitlists_controller.rb spec/controllers/controller_action_visibility_spec.rb
```

Commit:

```bash
git commit -m "fix: keep controller helpers private"
```

### Task 6: Full Verification

**Files:**
- Verify all modified application and spec files

- [ ] **Step 1: Run the focused repaired surface**

Run:

```bash
bundle exec rspec spec/services/storefront_curation_spec.rb spec/services/crate_strategies/picks_spec.rb spec/services/pick_policy_spec.rb spec/requests/oauth_flow_spec.rb spec/jobs/full_store_sync_job_spec.rb spec/jobs/enrichment_job_spec.rb spec/services/experiments/seed_generator_spec.rb spec/services/admin/store_onboarding_checks_spec.rb spec/services/application_operation_visibility_spec.rb spec/controllers/controller_action_visibility_spec.rb spec/controllers/dev_controller_spec.rb spec/requests/waitlists_spec.rb spec/requests/pile_wantlist_handoffs_spec.rb
```

Expected: PASS with no failures.

- [ ] **Step 2: Run repository verification**

Run:

```bash
bundle exec rspec
bundle exec rubocop --format simple
git diff --check origin/development
git status --short --branch
```

Expected:

- RSpec finishes with zero failures.
- RuboCop reports no offenses.
- `git diff --check` emits no whitespace errors.
- `git status` has no remaining uncommitted repair edits.

- [ ] **Step 3: Report completed repair commits and retained user change**

Summarize the repaired contracts, all verification command results, and note
that the `PileController` guard-clause cleanup was incorporated with user
approval.
