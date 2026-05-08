# Layered Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the top 3 layered architecture violations: move RecordScorer to Domain layer, decompose StoreSyncService, and extract domain policies from PicksSelector/StorefrontCuration.

**Architecture:** Three independent refactors on one branch. Each is a self-contained commit. No behavior changes — pure structural moves and extractions. All existing tests must pass at each commit.

**Tech Stack:** Ruby 3.4, Rails 8.1, RSpec, Inertia

---

## Task 1: Move RecordScorer to Domain Layer

**Files:**
- Create: `app/models/record_scorer.rb` (moved from services)
- Modify: `app/services/picks_selector.rb:1` (remove require_relative)
- Move: `spec/services/record_scorer_spec.rb` → `spec/models/record_scorer_spec.rb`
- Delete: `app/services/record_scorer.rb`

### Why:
`RecordScorer` is a pure domain calculator — zero orchestration, zero side effects. It computes vintage, condition, desirability, freshness, and noise scores. It's consumed by `PicksSelector`, `DailySelectionService`, and a rake task. It belongs in the Domain layer alongside `StorefrontTheme` (another non-AR domain object already in `app/models/`).

### Note on autoloading:
Rails autoloads `app/models/**/*.rb`, so moving the file means the `RecordScorer` constant will be available everywhere without requires. `DailySelectionService` and the rake task already reference `RecordScorer::` constants without a require — they rely on Rails autoloading, which will continue to work after the move.

- [ ] **Step 1: Move the file to app/models/**

```bash
git mv app/services/record_scorer.rb app/models/record_scorer.rb
```

- [ ] **Step 2: Remove require_relative from PicksSelector**

File: `app/services/picks_selector.rb`

Remove line 1:
```ruby
require_relative "record_scorer"
```

Edit: delete the entire line. The first line of the file should become `class PicksSelector` (line 3 currently).

Run:
```bash
sed -i '' '/^require_relative "record_scorer"$/d' app/services/picks_selector.rb
```

- [ ] **Step 3: Move spec file to match**

```bash
git mv spec/services/record_scorer_spec.rb spec/models/record_scorer_spec.rb
```

Update the spec's require if it uses `require_relative` to load the source. Check first:

```bash
grep -n "require" spec/models/record_scorer_spec.rb | head -5
```

If it has `require_relative` pointing to services, remove it — Rails autoloading handles it in spec environment too.

- [ ] **Step 4: Verify tests pass**

```bash
bin/rspec spec/models/record_scorer_spec.rb
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite to catch any reference issues**

```bash
bin/rspec
```

Expected: all existing tests pass (no behavior changes, just file relocate).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move RecordScorer from services to models (domain layer)

RecordScorer is a pure domain calculator — no orchestration, no side effects.
It computes scoring for vintage, condition, desirability, freshness, and noise.
Moving it to app/models/ places it alongside StorefrontTheme as a non-AR
domain object, resolving the primary layer violation from the layered
architecture analysis."
```

---

## Task 2: Decompose StoreSyncService

**Files:**
- Create: `app/services/store_sync/state_manager.rb`
- Modify: `app/services/store_sync_service.rb`
- Modify: `app/jobs/full_store_sync_job.rb`

### Why:
`StoreSyncService` is the D-rated bottleneck (RubyCritic). Two public methods (`sync`, `full_sync`) duplicate status management and the `manage_status:` flag is a control-flag anti-pattern. Extract status transitions into a `StateManager` and remove the flag.

### Design:
- `StoreSync::StateManager` — three class methods: `.start!(store)`, `.succeed!(store, attrs)`, `.fail!(store, error)`
- `StoreSyncService` — always manages its own status via StateManager (no `manage_status:` flag)
- `FullStoreSyncJob` — lets the service manage status, then adds extra attributes (catalog_coverage, inventory_page_count) after success
- Rake tasks — unchanged (they don't pass `manage_status:` today, but receive it implicitly via default; they'll continue to work since the flag is removed and the service always manages status)

- [ ] **Step 1: Create StoreSync::StateManager**

Create `app/services/store_sync/state_manager.rb`:

```ruby
module StoreSync
  class StateManager
    def self.start!(store)
      store.update!(sync_status: "syncing")
    end

    def self.succeed!(store, attributes = {})
      store.update!(
        {
          sync_status: "idle",
          last_sync_error: nil,
          last_sync_error_at: nil
        }.merge(attributes)
      )
    end

    def self.fail!(store, error)
      store.update!(
        sync_status: "failed",
        last_sync_error: summarized_error(error),
        last_sync_error_at: Time.current
      )
    end

    def self.summarized_error(error)
      summary = "#{error.class}: #{error.message}"
      backtrace = Array(error.backtrace).first(8)
      ([summary] + backtrace).join("\n")
    end
    private_class_method :summarized_error
  end
end
```

- [ ] **Step 2: Write spec for StateManager**

Create `spec/services/store_sync/state_manager_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe StoreSync::StateManager do
  let(:store) { create(:store, sync_status: "idle") }

  describe ".start!" do
    it "sets sync_status to syncing" do
      described_class.start!(store)
      expect(store.reload.sync_status).to eq("syncing")
    end
  end

  describe ".succeed!" do
    before { store.update!(sync_status: "syncing", last_sync_error: "old error", last_sync_error_at: 1.day.ago) }

    it "sets sync_status to idle and clears errors" do
      described_class.succeed!(store)
      store.reload
      expect(store.sync_status).to eq("idle")
      expect(store.last_sync_error).to be_nil
      expect(store.last_sync_error_at).to be_nil
    end

    it "merges additional attributes" do
      described_class.succeed!(store, last_synced_at: Time.current, total_listings: 42)
      store.reload
      expect(store.last_synced_at).to be_present
      expect(store.total_listings).to eq(42)
    end
  end

  describe ".fail!" do
    let(:error) { StandardError.new("something broke").tap { |e| e.set_backtrace(["line 1", "line 2"]) } }

    it "sets sync_status to failed with error details" do
      described_class.fail!(store, error)
      store.reload
      expect(store.sync_status).to eq("failed")
      expect(store.last_sync_error).to include("StandardError: something broke")
      expect(store.last_sync_error).to include("line 1")
      expect(store.last_sync_error_at).to be_present
    end
  end
end
```

- [ ] **Step 3: Run StateManager spec to verify**

```bash
bin/rspec spec/services/store_sync/state_manager_spec.rb
```

Expected: 4 examples pass.

- [ ] **Step 4: Refactor StoreSyncService — remove manage_status flag, use StateManager**

Edit `app/services/store_sync_service.rb`. Replace the entire file:

```ruby
class StoreSyncService
  Result = Data.define(:listing_ids_for_enrichment, :catalog_coverage, :inventory_page_count)

  def initialize(store)
    @store = store
    @client = DiscogsClient.new
    @normalizer = StoreSync::ListingNormalizer.new
  end

  # Full sync: crawls all pages. Pass max_pages: 1 for a quick 100-record dev sync.
  def full_sync(max_pages: nil, sort_order: "desc")
    sync_started_at = Time.current
    StoreSync::StateManager.start!(@store)

    fetcher = StoreSync::InventoryFetcher.new(@store, client: @client)
    result = fetcher.fetch(sort_order: sort_order, max_pages: max_pages)

    import_listings(result.listings)

    StoreSync::StateManager.succeed!(@store,
      last_synced_at: sync_started_at,
      total_listings: @store.listings.count
    )

    result.listings.size
  rescue StandardError => e
    StoreSync::StateManager.fail!(@store, e)
    raise
  end

  def sync(max_pages: nil)
    sync_started_at = Time.current
    StoreSync::StateManager.start!(@store)

    desc_result = fetch_public_listings(sort_order: "desc", max_pages:)
    asc_result = fetch_public_listings(sort_order: "asc", max_pages:)
    observed_page_count = [desc_result[:page_count], asc_result[:page_count]].max
    catalog_coverage = StoreSync::CoverageClassifier.new(
      observed_page_count:,
      max_pages:
    ).call

    reconciliation = StoreSync::ListingReconciler.new(
      store: @store,
      fetched_listings: desc_result[:listings] + asc_result[:listings],
      normalizer: @normalizer
    ).call

    StoreSync::StateManager.succeed!(@store,
      last_synced_at: sync_started_at,
      total_listings: @store.listings.count,
      catalog_coverage:,
      inventory_page_count: observed_page_count
    )

    Result.new(
      listing_ids_for_enrichment: reconciliation.listing_ids_for_enrichment,
      catalog_coverage:,
      inventory_page_count: observed_page_count
    )
  rescue StandardError => e
    StoreSync::StateManager.fail!(@store, e)
    raise
  end

  private

  def import_listings(raw_listings)
    records = raw_listings.filter_map { |raw| @normalizer.call(raw, store_id: @store.id) }
    return if records.empty?

    @store.listings.upsert_all(
      records,
      unique_by: :discogs_listing_id,
      update_only: %i[condition price currency format thumbnail_url last_seen_at notes]
    )
  rescue StandardError => e
    Rails.logger.error("[StoreSyncService] upsert_all failed: #{e.message}")
    raise
  end

  def fetch_public_listings(sort_order:, max_pages:)
    fetcher = StoreSync::InventoryFetcher.new(@store, client: @client)
    result = fetcher.fetch(sort_order: sort_order, max_pages: max_pages)

    {
      listings: result.listings,
      page_count: [result.pages_fetched, result.total_pages.to_i].max
    }
  end
end
```

Key changes from original:
- Removed `manage_status:` parameter from both `sync` and `full_sync`
- Replaced inline status updates with `StoreSync::StateManager.start!/succeed!/fail!`
- `sync` method now sets `catalog_coverage` and `inventory_page_count` via `succeed!` (previously only set when `manage_status: true`)
- Error handling uses `StateManager.fail!`
- Removed `summarized_sync_error` private method (moved to StateManager)

- [ ] **Step 5: Update FullStoreSyncJob**

Edit `app/jobs/full_store_sync_job.rb`. Replace the entire file:

```ruby
class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    service = StoreSyncService.new(store)
    sync_started_at = Time.current

    result = service.sync(max_pages: max_pages)

    # Service already set sync_status to idle and recorded last_synced_at.
    # Add the job-specific extras that the service doesn't own.
    store.update!(
      last_synced_at: sync_started_at,
      total_listings: store.listings.count,
      catalog_coverage: result.catalog_coverage,
      inventory_page_count: result.inventory_page_count
    )

    Rails.logger.info("FullStoreSync: synced #{store.listings.count} listings for #{store.discogs_username}")

    EnrichReleasesJob.perform_later(store_id, listing_ids: result.listing_ids_for_enrichment) if result.listing_ids_for_enrichment.any?
    DailyCurationJob.perform_later(store_id)
  rescue StandardError => error
    Rails.logger.error(
      "[FullStoreSyncJob] store=#{store&.discogs_username || store_id} job_id=#{job_id} failed\n#{error.full_message(highlight: false, order: :top)}"
    )
    store&.mark_sync_failed!(error)
    raise
  end
end
```

Key changes:
- No longer sets `sync_status: "syncing"` before calling service (service does it via StateManager)
- No longer passes `manage_status: false` (parameter removed)
- Still updates extra attributes after service succeeds (last_synced_at set to job's `sync_started_at`, plus catalog_coverage/inventory_page_count)
- Error handler still calls `store.mark_sync_failed!` as a safety net (service already did it, but job double-checks)

- [ ] **Step 6: Remove mark_sync_succeeded! and mark_sync_failed! from Store model (now unused)**

Check if anything besides `FullStoreSyncJob` uses these methods:

```bash
grep -rn "mark_sync_succeeded!\|mark_sync_failed!" --include="*.rb" | grep -v spec/
```

If only `FullStoreSyncJob` remains (after step 5), remove the methods from `app/models/store.rb`.

Actually — keep them. `FullStoreSyncJob` still calls `mark_sync_failed!` in its rescue block as a safety net. And they're still useful model methods. No change needed to `Store` model.

- [ ] **Step 7: Run the existing service and job specs**

```bash
bin/rspec spec/services/store_sync_service_spec.rb spec/jobs/full_store_sync_job_spec.rb spec/services/store_sync/
```

If any specs break due to `manage_status:` parameter, update them to remove that argument. The specs should mostly pass since the behavior is equivalent.

- [ ] **Step 8: Run full test suite**

```bash
bin/rspec
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: decompose StoreSyncService with StateManager

Extract sync status transitions into StoreSync::StateManager to remove
the manage_status control flag and duplicate status logic from both
sync and full_sync methods. StoreSyncService now always manages its own
status, and FullStoreSyncJob adds extra attributes post-success.

Resolves the D-rated god service issue identified in the layered
architecture analysis and Rails audit."
```

---

## Task 3: Extract Domain Policies from PicksSelector & StorefrontCuration

**Files:**
- Create: `app/models/pick_policy.rb`
- Create: `app/models/new_arrivals_policy.rb`
- Create: `app/models/curated_crate.rb`
- Modify: `app/services/picks_selector.rb`
- Modify: `app/services/storefront_curation.rb`
- Modify: `app/models/storefront_theme.rb` (update CuratedCrate reference)

### Why:
`PicksSelector` contains domain rules (genre diversity caps, sort order) mixed with orchestration. `StorefrontCuration` contains new-arrivals window selection logic that is a domain policy. `CuratedCrate` is a domain struct currently namespaced under `StorefrontCuration` — it should stand alone as a domain concept.

### Design:
- `PickPolicy` — value object holding genre diversity cap formula and sort strategy
- `NewArrivalsPolicy` — value object holding window sizes, minimum thresholds, and the window selection algorithm
- `CuratedCrate` — promoted from `StorefrontCuration::CuratedCrate` to top-level domain struct

- [ ] **Step 1: Create CuratedCrate domain struct**

Create `app/models/curated_crate.rb`:

```ruby
CuratedCrate = Struct.new(:slug, :name, :listings, keyword_init: true)
```

- [ ] **Step 2: Create PickPolicy domain value object**

Create `app/models/pick_policy.rb`:

```ruby
class PickPolicy
  # Maximum picks from any single genre to ensure diversity.
  # At least 2 per genre, at most count/3.
  def genre_cap(pick_count)
    [pick_count / 3, 2].max
  end

  # Sort key for picks: highest score first, then deterministic shuffle by seed.
  # Returns a sort-by array suitable for Enumerable#sort_by.
  def sort_key(listing, score, seed)
    [-score, Digest::MD5.hexdigest("#{listing.id}#{seed}")]
  end
end
```

- [ ] **Step 3: Write spec for PickPolicy**

Create `spec/models/pick_policy_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe PickPolicy do
  subject(:policy) { described_class.new }

  describe "#genre_cap" do
    it "returns 2 for small pick counts" do
      expect(policy.genre_cap(3)).to eq(2)
      expect(policy.genre_cap(4)).to eq(2)
      expect(policy.genre_cap(6)).to eq(2)
    end

    it "returns count/3 for larger pick counts" do
      expect(policy.genre_cap(12)).to eq(4)
      expect(policy.genre_cap(30)).to eq(10)
    end
  end

  describe "#sort_key" do
    let(:listing) { double("Listing", id: 42) }
    let(:seed) { 12345 }

    it "returns score-descending then deterministic-hash ordering" do
      key = policy.sort_key(listing, 5.0, seed)
      expect(key[0]).to eq(-5.0)
      expect(key[1]).to be_a(String) # MD5 hex digest
    end

    it "produces consistent results for same inputs" do
      expect(policy.sort_key(listing, 3.0, seed)).to eq(policy.sort_key(listing, 3.0, seed))
    end
  end
end
```

- [ ] **Step 4: Run PickPolicy spec**

```bash
bin/rspec spec/models/pick_policy_spec.rb
```

Expected: pass.

- [ ] **Step 5: Create NewArrivalsPolicy domain value object**

Create `app/models/new_arrivals_policy.rb`:

```ruby
class NewArrivalsPolicy
  # Windows to try when selecting new arrivals, from newest to oldest.
  # The first window with FEATURED_MIN_RECORDS or more eligible records wins.
  WINDOWS = [7, 14, 30, 90, 365].freeze

  # Minimum records required in a window to create a new-arrivals crate.
  MIN_RECORDS = 4

  # Number of records in the new-arrivals crate.
  CRATE_SIZE = 4

  # Select up to CRATE_SIZE records from the first window with enough
  # eligible listings. Falls back to the most recent records overall if
  # no window has enough.
  def select(pool, sort_key:)
    return [] if pool.empty?

    WINDOWS.each do |days|
      cutoff = days.days.ago
      recent = pool.select { |listing| listing.listed_at.present? && listing.listed_at >= cutoff }
      return recent.sort_by { |listing| -sort_key.call(listing) }.first(CRATE_SIZE) if recent.size >= MIN_RECORDS
    end

    pool.sort_by { |listing| -sort_key.call(listing) }.first(CRATE_SIZE)
  end
end
```

- [ ] **Step 6: Write spec for NewArrivalsPolicy**

Create `spec/models/new_arrivals_policy_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe NewArrivalsPolicy do
  subject(:policy) { described_class.new }

  def listing(id:, listed_at:)
    double("Listing", id: id, listed_at: listed_at)
  end

  describe "#select" do
    let(:sort_key) { ->(l) { l.listed_at.to_i } }

    it "returns empty array for empty pool" do
      expect(policy.select([], sort_key: sort_key)).to eq([])
    end

    it "selects from the newest window when it has enough records" do
      recent_listings = (1..5).map { |i| listing(id: i, listed_at: 1.day.ago) }
      old_listings = (6..10).map { |i| listing(id: i, listed_at: 60.days.ago) }
      pool = recent_listings + old_listings

      result = policy.select(pool, sort_key: sort_key)
      expect(result.size).to eq(4)
      expect(result.all? { |l| l.listed_at >= 7.days.ago }).to be true
    end

    it "falls back to broader windows when newest window has too few records" do
      recent = (1..2).map { |i| listing(id: i, listed_at: 2.days.ago) }
      medium = (3..6).map { |i| listing(id: i, listed_at: 10.days.ago) }
      pool = recent + medium

      result = policy.select(pool, sort_key: sort_key)
      expect(result.size).to eq(4)
      expect(result.all? { |l| l.listed_at >= 14.days.ago }).to be true
    end

    it "falls back to most recent overall when no window has enough" do
      old_listings = (1..5).map { |i| listing(id: i, listed_at: 400.days.ago) }
      result = policy.select(old_listings, sort_key: sort_key)
      expect(result.size).to eq(4)
    end
  end
end
```

- [ ] **Step 7: Run NewArrivalsPolicy spec**

```bash
bin/rspec spec/models/new_arrivals_policy_spec.rb
```

Expected: pass.

- [ ] **Step 8: Refactor PicksSelector to use PickPolicy**

Edit `app/services/picks_selector.rb` — replace `select_picks` method and add policy usage:

```ruby
require "digest"

class PicksSelector
  POOL_SIZE = 100

  def initialize(store, today: Date.today)
    @store = store
    @today = today
    @policy = PickPolicy.new
  end

  # Returns listings for picks crate: top records across the full inventory,
  # genre-diverse, freshness-adjusted.
  def select_picks(count: 12, seed: nil)
    scored = score_all
    shuffle_seed = seed || @today.to_s.sum

    genre_cap = @policy.genre_cap(count)
    genre_seen = Hash.new(0)

    scored
      .sort_by { |listing, s| @policy.sort_key(listing, s, shuffle_seed) }
      .filter_map { |listing, _|
        genre = listing.primary_genre
        next if genre_seen[genre] >= genre_cap
        genre_seen[genre] += 1
        listing
      }
      .uniq(&:id)
      .first(count)
  end

  # Returns all scored listings for a genre, sorted best-first.
  # Used by genre bins — operates on full inventory, not a daily pick subset.
  def rank_genre(genre)
    score_all
      .select { |listing, _| listing.primary_genre == genre }
      .sort_by { |_, s| -s }
      .map(&:first)
  end

  # Returns a breakdown hash of scoring components for a single listing.
  # Used by the score debug rake task to produce detailed output.
  def score_breakdown_for(listing)
    scorer_for(store_genre_counts).score_breakdown(listing)
  end

  private

  def score_all(listing_ids: nil)
    return scored_inventory.select { |l, _| listing_ids.include?(l.id) } if listing_ids&.any?
    scored_inventory
  end

  def scored_inventory
    @scored_inventory ||= begin
      listings = @store.listings.available.lp_only.to_a
      scorer = scorer_for(store_genre_counts)
      listings.map { |l| [l, scorer.score(l)] }
    end
  end

  def store_genre_counts
    @store_genre_counts ||= @store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
  end

  def scorer_for(genre_counts)
    RecordScorer.new(genre_counts:, today: @today)
  end
end
```

- [ ] **Step 9: Update StorefrontTheme to use top-level CuratedCrate**

Edit `app/models/storefront_theme.rb` — change line 34 from `StorefrontCuration::CuratedCrate.new(` to `CuratedCrate.new(`:

```ruby
  def crate_for(pool, slug: self.slug)
    CuratedCrate.new(
      slug:,
      name:,
      listings: listings_for(pool).first(FEATURED_CRATE_SIZE)
    )
  end
```

- [ ] **Step 10: Refactor StorefrontCuration to use NewArrivalsPolicy and top-level CuratedCrate**

Edit `app/services/storefront_curation.rb`. Key changes:
- Remove the `CuratedCrate` struct definition (now in `app/models/curated_crate.rb`)
- Use `NewArrivalsPolicy` for new arrivals selection
- Keep everything else the same

```ruby
require "set"

class StorefrontCuration
  FEATURED_CRATE_SIZE = 4
  FEATURED_MIN_RECORDS = 4
  GENRE_CRATE_SIZE = 50

  def initialize(store)
    @store = store
    @arrivals_policy = NewArrivalsPolicy.new
  end

  # Compatibility surface for current UI.
  def crates
    picks_list = selector.select_picks(count: 12)
    picks_ids = picks_list.map(&:id).to_set

    [
      CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: picks_list),
      *build_genre_crates(excluded_ids: picks_ids)
    ]
  end

  def storefront_sections
    picks_crate = CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: selector.select_picks(count: 12))
    seen_ids = picks_crate.listings.map(&:id).to_set

    sections = [{key: "picks_wall", crate: picks_crate}]

    featured_crates = build_featured_crates(excluded_ids: seen_ids)
    if featured_crates.present?
      featured_crates.each { |crate| crate.listings.each { |listing| seen_ids.add(listing.id) } }
      sections << {key: "featured_crates", crates: featured_crates}
    end

    sections << {key: "genre_grid", crates: build_genre_crates(excluded_ids: seen_ids)}
    sections
  end

  def surfaced_listings
    storefront_sections.flat_map { |section|
      crates = []
      crates << section[:crate] if section[:crate]
      crates.concat(section[:crates]) if section[:crates]
      crates
    }.flat_map(&:listings).uniq(&:id)
  end

  private

  def build_featured_crates(excluded_ids:)
    new_arrivals_listings = new_arrivals_listings(excluded_ids: excluded_ids)
    featured_seen_ids = excluded_ids | new_arrivals_listings.map(&:id).to_set

    new_arrivals = CuratedCrate.new(
      slug: "new-arrivals",
      name: "New Arrivals",
      listings: new_arrivals_listings
    )
    thematic = thematic_crate(excluded_ids: featured_seen_ids)

    return [] if [new_arrivals, thematic].any? { |crate| crate.listings.size < FEATURED_MIN_RECORDS }

    [new_arrivals, thematic]
  end

  def build_genre_crates(excluded_ids:)
    seen_ids = excluded_ids.dup

    genre_counts.filter_map do |genre, _|
      listings = selector.rank_genre(genre)
        .reject { |listing| seen_ids.include?(listing.id) }
        .first(GENRE_CRATE_SIZE)
      next if listings.empty?

      listings.each { |listing| seen_ids.add(listing.id) }
      CuratedCrate.new(slug: genre.parameterize, name: genre, listings: listings)
    end
  end

  def new_arrivals_listings(excluded_ids:)
    pool = eligible_listings.reject { |listing| excluded_ids.include?(listing.id) }
    @arrivals_policy.select(pool, sort_key: ->(listing) { sort_timestamp_for(listing) })
  end

  def thematic_crate(excluded_ids:)
    selection = StorefrontThemeRotation.new(@store, listings: eligible_listings).select(excluded_ids:)
    selection&.crate || CuratedCrate.new(slug: "thematic", name: "Daily Rotation", listings: [])
  end

  def sort_timestamp_for(listing)
    listing.listed_at&.to_i || listing.last_seen_at&.to_i || 0
  end

  def selector
    @selector ||= PicksSelector.new(@store)
  end

  def eligible_listings
    @eligible_listings ||= @store.listings.available.lp_only.to_a
  end

  def genre_counts
    @genre_counts ||= eligible_listings.map(&:primary_genre).compact.tally.sort_by { |_, count| -count }
  end
end
```

- [ ] **Step 11: Update StorefrontThemeRotation to use top-level CuratedCrate**

Check `app/services/storefront_theme_rotation.rb` — its `Selection` struct uses `StorefrontCuration::CuratedCrate` indirectly via `theme.crate_for`. Since `StorefrontTheme#crate_for` now uses `CuratedCrate` directly (step 9), no change needed in `StorefrontThemeRotation`.

- [ ] **Step 12: Run existing specs to verify no regressions**

```bash
bin/rspec spec/services/picks_selector_spec.rb spec/services/storefront_curation_spec.rb spec/services/storefront_theme_rotation_spec.rb spec/models/storefront_theme_spec.rb
```

Expected: all pass. If any spec references `StorefrontCuration::CuratedCrate`, update to `CuratedCrate`.

- [ ] **Step 13: Run full test suite**

```bash
bin/rspec
```

Expected: all tests pass.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "refactor: extract domain policies from PicksSelector and StorefrontCuration

- Extract PickPolicy (genre diversity cap, sort strategy) from PicksSelector
- Extract NewArrivalsPolicy (window selection, thresholds) from StorefrontCuration
- Promote CuratedCrate from StorefrontCuration::CuratedCrate to top-level domain struct
- PicksSelector and StorefrontCuration are now thinner orchestrators that delegate
  domain rules to named policy objects

Resolves the half-domain/half-application layer violation in PicksSelector
and the accumulated policy complexity in StorefrontCuration."
```

---

## Task 4: Create PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin layered-architecture-refactor
```

- [ ] **Step 2: Open PR**

Use the GitHub CLI or web UI to create a pull request from `layered-architecture-refactor` into `development`.

PR title: `refactor: layered architecture — move RecordScorer to domain, decompose StoreSyncService, extract curation policies`

PR body:

```markdown
## Summary

Resolves the top 3 findings from the layered architecture analysis:

1. **Move RecordScorer to domain layer** — `RecordScorer` is a pure domain calculator with zero orchestration. Moves from `app/services/` to `app/models/` alongside `StorefrontTheme`.

2. **Decompose StoreSyncService** — Extracts `StoreSync::StateManager` for sync status transitions, removes the `manage_status:` control flag, and eliminates duplicate status logic between `sync` and `full_sync`.

3. **Extract domain policies** — Creates `PickPolicy` (genre diversity rules), `NewArrivalsPolicy` (window selection), and promotes `CuratedCrate` to a top-level domain struct. `PicksSelector` and `StorefrontCuration` become thinner orchestrators.

## Commits
- `refactor: move RecordScorer from services to models (domain layer)`
- `refactor: decompose StoreSyncService with StateManager`
- `refactor: extract domain policies from PicksSelector and StorefrontCuration`

## Testing
- All existing specs pass
- New specs for `StateManager`, `PickPolicy`, and `NewArrivalsPolicy`
- No behavior changes — pure structural refactor
```

- [ ] **Step 3: Verify CI passes**

Check that the PR's CI pipeline runs green.
