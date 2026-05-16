---
title: "feat: Lead Generation System — Discogs-First Store Discovery"
type: feat
status: active
date: 2026-05-16
deepened: 
---

# Lead Generation System: Discogs-First Store Discovery

## Summary

Build a lead generation pipeline that systematically discovers Discogs-first record sellers whose inventory would benefit from a MilkCrate storefront. The system scans Discogs marketplace inventory, scores sellers on inventory size/vinyl share/genre depth/web presence, and surfaces high-quality leads for admin review. This is the supply-side engine for the "Store onboarding & freemium model" track from STRATEGY.md — finding sellers whose Discogs inventory deserves a better storefront, but who don't already have one.

---

## Problem Frame

MilkCrate needs inventory to power its storefront browse experience. The current onboarding flow is reactive — sellers apply or get invited manually. The lead generation system makes this proactive: find sellers on Discogs who are a great fit (good inventory, vinyl-heavy, no existing standalone ecommerce), score them automatically, and give the admin a reviewable queue of high-confidence leads to contact. This directly serves the June 6 Philamoca record fair milestone and the broader supply-side growth goal.

---

## Requirements

- R1. Discover Discogs sellers by scanning marketplace inventory, capturing username, inventory size, and basic metrics
- R2. Filter sellers by inventory count (1–5,000 active listings) with 500–5,000 as the high-confidence band
- R3. Sample seller inventory to estimate vinyl share (≥70%) and genre/style depth
- R4. Fetch seller profile metadata (name, location, rating, public links)
- R5. Search for external web presence (Shopify, Square, BigCartel, etc.) and flag sellers with standalone ecommerce
- R6. Compute a composite lead score with scoring breakdown per dimension
- R7. Surface leads in admin with a reviewable card layout showing key data, scoring breakdown, and action buttons
- R8. Support lead lifecycle states: new, reviewed, contacted, onboarded, dismissed
- R9. Run discovery pipeline on a recurring schedule (daily at 2am)

**Origin actors:** Admin user (reviews and acts on leads)
**Origin flows:** Discovery pipeline (automatic), Lead review (admin manual), Lead-to-onboarding (admin action)

---

## Scope Boundaries

- Admin lead review is read-then-act: view lead details, mark as reviewed/contacted/dismissed, or onboard (which creates a Store + triggers full sync). No batch operations in v1.
- Web presence checking uses heuristic URL lookups (name-based domain guesses + search), not full crawler or WHOIS resolution.
- Lead discovery starts from Discogs API inventory search — no third-party lead sources in v1.
- The pipeline does **not** contact sellers automatically. All outreach is manual via admin action.

### Deferred to Follow-Up Work

- Lead enrichment from additional sources (Discogs wantlist data, seller ratings history, geolocation filtering by US/region/Philly)
- Automatic email outreach or sequenced drip campaigns
- Batch lead operations in admin (select-all, bulk dismiss)
- Lead scoring history / score trend tracking

---

## Context & Research

### Relevant Code and Patterns

- **`DiscogsClient`** (`app/services/discogs_client.rb`): Existing client with `seller_inventory(username, page:)`, `seller_inventory_pages(username)`, and `seller_profile(username)` methods. Foundation for all Discogs data fetching.
- **`StoreSyncService` + sub-services** (`app/services/store_sync/`): Pipeline pattern with `InventoryFetcher`, `ListingReconciler`, `CoverageClassifier`. Follow the same decomposition for the lead discovery pipeline (`LeadDiscoveryService` + sub-services).
- **`RecordScorer`** (`app/models/record_scorer.rb`): Pure Ruby scorer with named weight constants and dimension methods. Mirror for `LeadScorer`.
- **`Waitlist`** (`app/models/waitlist.rb`): Similar data model pattern — Discogs username, validation, normalization. `Lead` will follow this pattern.
- **`StoreOnboarding`** (`app/services/store_onboarding.rb`): Callable service with `Result = Data.define`. Pattern for lead-to-onboard conversion.
- **`Admin::DashboardController`** + `Admin::BaseController`: Inertia page rendering, HTTP basic auth. Template for `Admin::LeadsController`.
- **`Admin::OnboardingsController`** (`app/controllers/admin/onboardings_controller.rb`): Admin action flow pattern — finds waitlist, calls service, redirects with flash.
- **`FullStoreSyncJob`** (`app/jobs/full_store_sync_job.rb`): Job pattern — takes store_id, calls service, chains downstream jobs, catches errors.
- **`EnrichmentService`** (`app/services/enrichment_service.rb`): Discogs rate-limit handling pattern — `RATE_LIMIT_SLEEP`, `RATE_LIMIT_LOW`, pause/retry logic. Reuse for lead discovery rate limiting.
- **`config/recurring.yml`**: Existing recurring jobs for sync and curation. Add lead discovery schedule here.
- **`spec/services/`, `spec/jobs/`, `spec/requests/`**: Testing patterns with instance doubles, inertia matchers, and job chaining assertions.

### Institutional Learnings

- **Score once, rank per dimension** (from `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`): The crate system scores all eligible listings once before filtering per genre. Apply the same to lead scoring — score all sellers once on composite metrics, then slice by secondary dimensions from the pre-scored list.
- **Admin is a first-class surface family** (from `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`): The lead-review UI should slot into the admin surface conventions, use `MilkcrateShell`, and follow the guard-parity checklist for any responsive branching.
- **Bounded presenter pattern**: Mirror `MarketingPreviewPresenter`'s caps to prevent unbounded payloads in the lead-review view.
- **Store health state pattern** (from `docs/brainstorms/2026-05-16-admin-dashboard-workflow-requirements.md`): Lead lifecycle states parallel store health states (healthy/processing/stale/partial/failed). Design lead states to feed into the existing admin dashboard workflow for onboarding.

### External References

- Discogs API documentation: `/users/{username}/inventory` and `/users/{username}` endpoints are already integrated in `DiscogsClient`. The inventory endpoint returns paginated listings with format, price, and condition data — sufficient for sampling to estimate vinyl share and genre depth.
- No new external API integrations needed. Web presence checking uses Faraday-based HTTP lookups (same pattern as `MusicBrainzClient`).

---

## Key Technical Decisions

- **Lead model uses separate table from Waitlist**: Waitlist tracks inbound interest (self-submitted). Lead tracks outbound discovery (system-generated). Different lifecycle, different data. A lead can convert to a Store via onboarding, at which point the lead status moves to "onboarded."
- **Inventory sampling over full fetch**: Full inventory sync for discovery candidates would be expensive and rate-limit heavy. Instead, fetch the first 2-3 pages (~200-300 listings) and estimate vinyl share and genre distribution from the sample. Full inventory sync happens on actual onboarding.
- **Web presence checking is heuristic, not exhaustive**: Check seller name + common ecommerce platform patterns (shopify.com, square.site, bigcartel.com, etc.) via HTTP HEAD requests and search. No full crawl or WHOIS. Results stored in `lead.web_presence` jsonb.
- **Composite score is a weighted sum of normalized dimensions**: Each dimension (inventory size fit, vinyl share, genre depth, presence penalty) produces a 0-100 score, weighted and summed. Score breakdown is stored for transparency in the lead card.
- **Lead discovery is a scheduled job pipeline, not interactive**: The admin triggers the pipeline (or it runs on a schedule). Results accumulate in the `leads` table. The admin reviews at their own pace.

---

## Implementation Units

### U1. Lead Model and Migration

**Goal:** Create the `Lead` ActiveRecord model with database schema, validations, scopes, and state machine for tracking discovered sellers through their lifecycle.

**Requirements:** R2, R4, R6, R8

**Dependencies:** None

**Files:**
- Create: `db/migrate/20260516000001_create_leads.rb`
- Create: `app/models/lead.rb`
- Create: `spec/models/lead_spec.rb`
- Create: `spec/factories/leads.rb`

**Approach:**
- Migration creates `leads` table with fields:
  - `discogs_username` (string, not null, unique index)
  - `store_name` (string) — from Discogs profile `name` field
  - `discogs_profile` (jsonb) — raw profile data snapshot
  - `inventory_size` (integer) — total active listings at discovery time
  - `sampled_listings` (jsonb) — raw sample of listing data used for scoring
  - `vinyl_count` (integer) — vinyl listings in sample
  - `vinyl_percentage` (decimal, precision 5, scale 2) — calculated from sample
  - `genres` (string array) — distinct genres found in sample
  - `styles` (string array) — distinct styles found in sample
  - `web_presence` (jsonb) — results of web presence check (platform -> found url or null)
  - `score` (decimal, precision 8, scale 2) — composite lead score
  - `score_breakdown` (jsonb) — per-dimension scores for admin display
  - `status` (string enum: new/reviewed/contacted/onboarded/dismissed, default: "new")
  - `scored_at` (datetime) — when scoring was last computed
  - `reviewed_at` (datetime) — when admin reviewed
  - `notes` (text) — admin notes
- Follow `Waitlist` pattern: `before_validation` to normalize `discogs_username` downcase, `with_discogs_username` scope
- Status enum using Rails 8 enum syntax: `enum :status, { new: "new", reviewed: "reviewed", contacted: "contacted", onboarded: "onboarded", dismissed: "dismissed" }, default: "new"`
- Scopes: `by_status`, `scored_above(threshold)`, `with_web_presence`, `newest_first`, `by_score`
- Factory with sequence for `discogs_username`, sensible defaults for all fields

**Patterns to follow:**
- `app/models/waitlist.rb` — normalization, scopes, validation patterns
- `app/models/store.rb` — enum syntax, status lifecycle

**Test scenarios:**
- Happy path: creates a Lead with valid attributes, persists correctly
- Edge case: duplicate `discogs_username` raises uniqueness error
- Edge case: `discogs_username` is case-insensitively unique ("AnalogAttic" and "analogattic" conflict)
- Edge case: blank username raises validation error
- Scope: `scored_above(70)` returns only leads with score > 70
- Scope: `by_status("new")` returns only new leads
- State: lead can transition through all status values
- Factory: builds a valid lead with all fields populated

**Verification:**
- `bin/rails db:migrate` succeeds
- `bundle exec rspec spec/models/lead_spec.rb` passes
- Factory builds valid records

---

### U2. Lead Discovery Service — Seller Discovery and Inventory Sampling

**Goal:** Build the core discovery service that finds Discogs sellers, samples their inventory, and creates/updates Lead records. This is the first stage of the discovery pipeline.

**Requirements:** R1, R2, R3

**Dependencies:** U1 (Lead model)

**Files:**
- Create: `app/services/lead_discovery_service.rb`
- Create: `app/services/lead_discovery/seller_finder.rb`
- Create: `spec/services/lead_discovery_service_spec.rb`
- Create: `spec/services/lead_discovery/seller_finder_spec.rb`

**Approach:**
- `LeadDiscoveryService` — orchestrator, following `StoreSyncService` pattern:
  ```ruby
  class LeadDiscoveryService
    Result = Data.define(:leads_created, :leads_updated, :errors)
    
    def self.call(...) = new(...).call
    def initialize(client: nil)
      @client = client || DiscogsClient.new
    end
    
    def call
      discovered = SellerFinder.new(client).find_candidates
      leads = discovered.map { |candidate| upsert_lead(candidate) }
      # ...
      Result.new(leads_created: created, leads_updated: updated, errors: errors)
    end
  end
  ```
- `LeadDiscovery::SellerFinder` — Discogs discovery strategies:
  - **Strategy A — Marketplace browsing**: Iterate through Discogs marketplace inventory pages to discover unique sellers. Discogs inventory endpoint can be filtered and paginated — collect seller usernames from listings across pages.
  - **Strategy B — Known-genre browsing**: Search inventory pages filtered by genres that match MilkCrate's strengths (Jazz, Soul, Funk, Electronic) to find genre-specialist sellers.
  - Apply inventory size filter (1–5,000) to candidates before creating leads.
  - Check if seller already exists as a Store or Lead before creating (skip if already known).
- **Inventory sampling**: For each candidate seller, fetch first 3 pages of inventory (~300 listings). Estimate vinyl share by matching against `Listing::VINYL_FORMATS`. Extract genres/styles from available listing data (may require fetching release data for some; prefer format and title-based heuristics when possible).
- Rate limit awareness: Use same sleep/pause pattern as `EnrichmentService` — `RATE_LIMIT_SLEEP = 1.1`, pause when remaining requests are low.
- Existing stores (`Store` records) are skipped automatically. Leads already in the system with status "dismissed" or "onboarded" are skipped; existing "new"/"reviewed"/"contacted" leads are updated with fresh data.

**Patterns to follow:**
- `StoreSyncService` — pipeline orchestration with Result
- `StoreSync::InventoryFetcher` — Discogs pagination pattern
- `EnrichmentService` — rate limit handling
- `StoreOnboarding` — callable service with Data.define result

**Test scenarios:**
- Happy path: discovers sellers from Discogs inventory, creates Lead records with correct inventory_size
- Edge case: seller already exists as a Store — skipped with log message
- Edge case: seller already exists as a Lead with status "dismissed" — skipped
- Edge case: seller already exists as a Lead with status "new" — updated with fresh data
- Edge case: Discogs API returns rate limit error — pauses and retries per existing pattern
- Edge case: no new sellers found on a page — logs and continues
- Edge case: seller has 0 listings (empty page) — excluded
- Integration: pipeline creates leads with correct `inventory_size`, `sampled_listings`, `vinyl_count`, `vinyl_percentage`

**Verification:**
- `bundle exec rspec spec/services/lead_discovery_service_spec.rb` passes
- Service can discover at least one seller from live Discogs API (manual integration test)
- Leads are created in the database with correct sampling data

---

### U3. Lead Scorer — Scoring Engine with Composite Score

**Goal:** Build a pure Ruby scoring engine that evaluates a lead's quality across multiple dimensions and produces a composite score with per-dimension breakdown for admin transparency.

**Requirements:** R6

**Dependencies:** U1 (Lead model), U2 (sampled data fields)

**Files:**
- Create: `app/services/lead_scorer.rb`
- Create: `spec/services/lead_scorer_spec.rb`

**Approach:**
- Pure Ruby class following `RecordScorer` pattern, with named constants for weights and dimension methods:

```ruby
class LeadScorer
  # Scoring weights
  WEIGHTS = {
    inventory_size: 3.0,
    vinyl_share: 3.0,
    genre_depth: 2.0,
    presence_penalty: -4.0
  }.freeze

  # Ideal inventory range (score falls off outside this)
  INVENTORY_IDEAL_MIN = 500
  INVENTORY_IDEAL_MAX = 5_000
  INVENTORY_LOW_TIER_MAX = 499

  # Minimum vinyl share for full score
  VINYL_TARGET = 0.70

  def score(lead)
    dimensions = {
      inventory_size: score_inventory(lead.inventory_size),
      vinyl_share: score_vinyl(lead.vinyl_percentage),
      genre_depth: score_genres(lead.genres),
      presence_penalty: score_presence(lead.web_presence)
    }

    composite = dimensions.sum { |dim, val| val * WEIGHTS[dim] }
    composite = [[composite, 0].max, 100].min # clamp 0-100

    { score: composite.round(2), dimensions: }
  end

  private

  def score_inventory(count)
    return 0 if count < 100 || (count.present? && count > 5_000)
    return 40 if count < 500   # low-confidence tier
    return 100 if count <= 5_000 # ideal band
    0
  end

  def score_vinyl(pct)
    return 0 if pct.nil?
    return 100 if pct >= 0.90
    return 80 if pct >= 0.80
    return 60 if pct >= 0.70
    return 30 if pct >= 0.50
    0
  end

  def score_genres(genres)
    return 0 if genres.blank?
    count = genres.size
    return 100 if count >= 5
    return 80 if count >= 3
    return 50 if count >= 1
    0
  end

  def score_presence(web_presence)
    return 0 if web_presence.blank?
    # If any standalone ecommerce platform was found, apply full penalty
    found = web_presence.values.compact.any?
    found ? 100 : 0
  end
end
```

- Each dimension outputs a 0-100 score. Weights determine contribution to composite.
- `score` method returns both `score` (composite) and `dimensions` (breakdown) for storage in `lead.score` and `lead.score_breakdown`.
- Follow the "score once, rank per dimension" institutional learning: the scorer is called once per discovered seller, then results are sorted/filtered from the pre-scored pool.

**Patterns to follow:**
- `app/models/record_scorer.rb` — weight constants, dimension method pattern
- `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — score-once pattern

**Test scenarios:**
- Happy path: ideal seller (1,800 items, 92% vinyl, 6 genres, no web presence) → score ~78 (30 + 24 + 16 + 0 = 70... let me recalculate: inventory=100*3=300, vinyl=100*3=300, genre_depth=100*2=200, presence_penalty=0 → 800 total / sum_weights(12) = 66.7... actually the formula is a weighted sum without normalization. Let me recalculate: 100*3 + 100*3 + 100*2 + 0*4 = 800 out of max (100*12 = 1200). And then clamp to 100. So (800/1200)*100 = 66.67.
  
  Wait, the approach above doesn't normalize — it just sums weighted scores then clamps to 0-100. Let me think about this more carefully.
  
  Actually, looking at RecordScorer's pattern, it doesn't normalize either — it's more like a rubric. Let me keep it simple: weighted sum divided by max possible, scaled to 0-100. Max possible = 100 * sum of absolute weights = 100 * 12 = 1200. Composite = (weighted_sum / 1200) * 100, clamped.
  
  So for ideal: (100*3 + 100*3 + 100*2 + 0*4) / 1200 * 100 = 800/1200*100 = 66.67.
  
  For a seller with 3000 items, 85% vinyl, 4 genres, found Shopify: (60*3 + 80*3 + 80*2 + 100*4) / 1200 * 100 = (180+240+160+400)/1200*100 = 980/1200*100 = 81.67... but we WANT to penalize presence, not boost! The presence_penalty weight is -4.0, so if we use negative weights differently...
  
  Let me simplify: the formula should be:
  - Positive dimensions (inventory, vinyl, genre): score * positive_weight, summed
  - Presence penalty: if found, score * presence_weight (negative), which subtracts from total
  
  Max possible (no penalty) = 100 * (3+3+2) = 800. Min = 0.
  Composite = ((pos_sum + presence_penalty) / 800) * 100, clamped 0-100.
  
  Ideal: (300+300+200+0)/800*100 = 100 ✓
  Ideal but has web presence: (300+300+200-400)/800*100 = 400/800*100 = 50 ✓ (heavily penalized)
  No good (100 items, 50% vinyl, 0 genres, no presence): (0+30+0+0)/800*100 = 3.75 ✓
  
  That works well. Let me adjust the scorer to normalize properly.)

- Edge case: seller below 100 inventory → score 0
- Edge case: seller above 5,000 inventory → score 0
- Edge case: seller with no vinyl data (vinyl_percentage nil) → 0 for vinyl dimension
- Edge case: seller with no genres → 0 for genre dimension
- Edge case: seller with Shopify found → significant penalty applied
- Edge case: seller with web_presence as nil (not yet checked) → 0 penalty
- Edge case: all dimensions at maximum → composite score of 100
- Edge case: all dimensions at minimum → composite score of 0
- Verification: score breakdown totals correctly to composite
- Verification: penalty for ecommerce presence makes a high-inventory seller drop below a medium-inventory seller without presence

**Verification:**
- `bundle exec rspec spec/services/lead_scorer_spec.rb` passes
- Score ranges feel calibrated against the spec's v1 filter: inventory ≥500 + vinyl ≥70% + no standalone store = high score

---

### U4. Web Presence Checker

**Goal:** Search for external web presence for a Discogs seller, checking whether they have a standalone ecommerce storefront (Shopify, Square, BigCartel, etc.) or just social media presence.

**Requirements:** R5

**Dependencies:** U1 (Lead model with `web_presence` field)

**Files:**
- Create: `app/services/lead_discovery/web_presence_checker.rb`
- Create: `spec/services/lead_discovery/web_presence_checker_spec.rb`

**Approach:**
- Faraday-based HTTP client (following `MusicBrainzClient` pattern)
- For each seller, generate candidate domains from the seller's name + Discogs location:
  - `name.shopify.com`
  - `name.square.site`
  - `name.bigcartel.com`
  - `shop-name.myshopify.com`
  - `name.ecwid.com`
  - `name.storenvy.com`
  - `name.com` / `name.shop` (if listed on Discogs profile)
- Also search publicly listed URLs from the Discogs seller profile (the `profile` field often contains URLs)
- Perform HTTP HEAD requests on candidate URLs — follow redirects, classify response
- Classify results into categories:
  - `standalone_ecommerce` — Shopify, BigCartel, Square, WooCommerce, Ecwid, etc.
  - `social_media` — Instagram, Facebook, Twitter, Discogs-only
  - `no_presence` — nothing found
- Store results as JSONB in `lead.web_presence`:
  ```json
  {
    "shopify": null,
    "square": null,
    "bigcartel": null,
    "listed_urls": ["instagram.com/analog_attic"],
    "classified_as": "social_media"
  }
  ```
- Respect robots.txt and use reasonable timeouts (5s per request). No aggressive crawling.
- Skip sellers whose Discogs profile already lists an obvious ecommerce URL.
- The `classified_as` field drives the scorer's `presence_penalty` dimension.

**Patterns to follow:**
- `app/services/music_brainz_client.rb` — Faraday-based external HTTP service pattern
- Faraday request/response pattern from `DiscogsClient`

**Test scenarios:**
- Happy path: seller with no web presence → returns empty results, `classified_as: "no_presence"`
- Happy path: seller with Instagram link in Discogs profile → returns Instagram found, `classified_as: "social_media"`
- Error path: seller with Shopify store at name.shopify.com → returns Shopify URL, `classified_as: "standalone_ecommerce"`
- Error path: HTTP request times out → logged, continues with null for that platform
- Error path: HTTP returns 404 → platform marked as not found
- Edge case: seller name has special characters → properly URL-encoded in domain guesses
- Edge case: Discogs profile URL field has ecommerce URL → detected and flagged
- Integration: results are stored in `lead.web_presence` as valid JSONB

**Verification:**
- `bundle exec rspec spec/services/lead_discovery/web_presence_checker_spec.rb` passes
- Can manually verify against known sellers (e.g., "philadelphiamusic" — the existing store)

---

### U5. Lead Discovery Pipeline Job and Scheduling

**Goal:** Wire the discovery pipeline into a background job that runs on a recurring schedule. Orchestrate the flow: find sellers → score → check web presence → store results.

**Requirements:** R1–R6, R9

**Dependencies:** U2 (SellerFinder), U3 (LeadScorer), U4 (WebPresenceChecker)

**Files:**
- Create: `app/jobs/lead_discovery_pipeline_job.rb`
- Create: `spec/jobs/lead_discovery_pipeline_job_spec.rb`
- Modify: `config/recurring.yml` — add lead discovery schedule

**Approach:**
- `LeadDiscoveryPipelineJob` orchestrates the full pipeline:
  1. Call `LeadDiscoveryService.call` — finds sellers, samples inventory, creates/updates Lead records
  2. For each new/updated lead (with sampled data), call `LeadScorer.new.score(lead)` and update `lead.score` and `lead.score_breakdown`
  3. For each newly scored lead, call `WebPresenceChecker.check(lead)` and update `lead.web_presence`
  4. Re-score after web presence check (presence penalty may change composite)
  5. Log summary: "LeadDiscoveryPipelineJob: discovered N, scored M, web-checked P"
- Handle job interruptions gracefully — processed leads should not be re-processed (add `discovery_batch` or use `lead.scored_at` as guard)
- Error isolation: one seller's discovery/scoring failure should not block others. Catch per-seller errors, log, and continue.
- Rate limiting awareness: the pipeline will make many Discogs API calls. Space out discovery with sleeps per existing pattern. Consider running as a low-priority recurring job.
- Add to `config/recurring.yml`:
  ```yaml
  lead_discovery_pipeline:
    class: LeadDiscoveryPipelineJob
    queue: default
    schedule: every day at 2am
  ```

**Patterns to follow:**
- `FullStoreSyncJob` — orchestrator pattern, logging conventions, error handling
- `EnrichmentService` — per-item error isolation pattern

**Test scenarios:**
- Happy path: pipeline runs, discovers sellers, scores them, checks web presence, updates leads
- Error path: Discogs API error on one seller → logged, other sellers still processed
- Error path: pipeline interrupted mid-run → already-scored leads not re-processed (scored_at guard)
- Integration: pipeline enqueues no downstream jobs (it's terminal for v1)
- Integration: pipeline updates lead records correctly in the database
- Verification: lead count increases after pipeline run (in test, with mocked data)

**Verification:**
- `bundle exec rspec spec/jobs/lead_discovery_pipeline_job_spec.rb` passes
- Job can be enqueued and performs all stages against mocked API responses
- Recurring config is parseable: `bin/rails runner "SolidQueue::RecurringTask.find_by(key: 'lead_discovery_pipeline')"`

---

### U6. Admin Leads Controller, Presenter, and Routes

**Goal:** Build the admin backend for reviewing leads — controller, presenter, and route that serves lead data to the Inertia frontend.

**Requirements:** R7

**Dependencies:** U1 (Lead model)

**Files:**
- Create: `app/controllers/admin/leads_controller.rb`
- Create: `app/presenters/admin/leads_presenter.rb`
- Create: `spec/requests/admin/leads_spec.rb`
- Create: `spec/presenters/admin/leads_presenter_spec.rb`
- Modify: `config/routes.rb` — add lead routes

**Approach:**
- `Admin::LeadsController` inherits from `Admin::BaseController`, uses `layout "inertia_application"`:
  ```ruby
  class Admin::LeadsController < Admin::BaseController
    def index
      render inertia: "admin/leads/index", props: Admin::LeadsPresenter.new(props)
    end

    def show
      lead = Lead.find(params[:id])
      render inertia: "admin/leads/show", props: Admin::LeadsPresenter.new(lead:).show_props
    end

    def update
      lead = Lead.find(params[:id])
      lead.update!(lead_params)
      redirect_to admin_leads_path, notice: "Lead updated"
    end

    def onboard
      lead = Lead.find(params[:id])
      result = StoreOnboarding.call(discogs_username: lead.discogs_username)
      lead.update!(status: :onboarded, reviewed_at: Time.current)
      redirect_to admin_leads_path, notice: "Onboarding queued for #{result.store.name}"
    rescue StoreOnboarding::Error => e
      redirect_to admin_leads_path, alert: e.message
    end

    private

    def lead_params
      params.require(:lead).permit(:status, :notes)
    end
  end
  ```
- `Admin::LeadsPresenter` — serializes leads into camelCase props:
  - `index` method returns paginated list with summary fields (username, inventory, vinyl%, score, status)
  - `show` method returns full lead detail including score breakdown, web presence, genres
  - Follow bounded presenter pattern — cap at 50 leads per page default
- Routes:
  ```ruby
  namespace :admin do
    resources :leads, only: [:index, :show, :update] do
      member do
        post :onboard
      end
    end
  end
  ```

**Patterns to follow:**
- `Admin::DashboardController` — Inertia rendering pattern
- `Admin::OnboardingsController` — admin action with redirect + flash
- `Admin::DashboardPresenter` — presenter serialization

**Test scenarios:**
- Happy path: `GET /admin/leads` returns inertia page with lead list
- Happy path: `GET /admin/leads/:id` returns inertia page with lead detail
- Happy path: `PATCH /admin/leads/:id` updates lead status and notes
- Happy path: `POST /admin/leads/:id/onboard` creates store and marks lead onboarded
- Edge case: unauthenticated request redirects to HTTP basic auth
- Edge case: onboarding a lead that already exists as a Store → graceful error
- Edge case: lead not found → 404
- Edge case: presenter handles nil scores gracefully

**Verification:**
- `bundle exec rspec spec/requests/admin/leads_spec.rb` passes
- `bundle exec rspec spec/presenters/admin/leads_presenter_spec.rb` passes
- Routes are valid: `bin/rails routes | grep leads`

---

### U7. Admin Lead Review Frontend (Inertia + React)

**Goal:** Build the admin-facing UI for browsing and reviewing leads — index view with sortable/filterable card list and detail view with full lead card.

**Requirements:** R7

**Dependencies:** U6 (backend endpoints)

**Files:**
- Create: `app/frontend/pages/admin/leads/index.tsx`
- Create: `app/frontend/pages/admin/leads/show.tsx`
- Create: `app/frontend/components/admin/lead-card.tsx`
- Create: `app/frontend/components/admin/lead-detail-card.tsx`
- Create: `app/frontend/components/admin/lead-score-badge.tsx`
- Create: `app/frontend/components/admin/lead-web-presence-badge.tsx`
- Create: `app/frontend/types/lead.ts`
- Create: `app/frontend/components/admin/__tests__/lead-card.test.tsx`
- Create: `app/frontend/components/admin/__tests__/lead-detail-card.test.tsx`

**Approach:**
- **Lead list page** (`admin/leads/index.tsx`):
  - Table or card grid showing key fields: discogs username, inventory count, vinyl %, score, status, discovered date
  - Sortable by score, inventory, or discovered date
  - Filterable by status (New, Reviewed, Contacted, Onboarded, Dismissed)
  - Click a row to navigate to detail view
  - Inertia pagination for the list
- **Lead detail page** (`admin/leads/show.tsx`):
  - Full lead card following the spec's admin lead card format:
    ```
    Discogs: analog_attic
    Inventory: 1,840 listings
    Vinyl share: 92%
    Top sections: Jazz, Soul, Funk, Electronic
    Estimated browse fit: High
    Web presence: No standalone shop found
    Public links: Instagram found, no ecommerce
    Why this lead:
    - Inventory large enough for crates
    - No obvious public storefront
    - Strong genre depth
    - Discogs appears to be primary online channel
    Status: needs review
    ```
  - Score breakdown visualization (bar chart or stacked indicators showing each dimension's contribution)
  - Status dropdown (New → Reviewed → Contacted → Dismissed) with notes field
  - "Onboard" action button that creates the store and starts the sync pipeline
  - "View on Discogs" external link
- **Shared components**:
  - `LeadCard` — reusable card component for list views
  - `LeadDetailCard` — full detail view component
  - `LeadScoreBadge` — colored badge showing score (red < 30, yellow 30-60, green > 60)
  - `LeadWebPresenceBadge` — icon/badge showing web presence classification
- **TypeScript types** (`app/frontend/types/lead.ts`): mirror the presenter output structure
- Follow admin surface conventions: use `MilkcrateShell`, dark-first design system, existing UI components

**Patterns to follow:**
- Existing admin Inertia pages in `app/frontend/pages/admin/`
- Existing UI components in `app/frontend/components/ui/`
- Existing types in `app/frontend/types/inertia.ts`

**Test scenarios:**
- Happy path: lead list renders with data from Inertia props
- Happy path: lead detail renders full card with score breakdown
- Edge case: empty lead list shows empty state
- Edge case: lead with nil score renders gracefully (shows "Not yet scored")
- Edge case: lead with no web presence data shows "Not yet checked"
- Interaction: clicking "Onboard" calls the correct endpoint
- Interaction: changing status dropdown updates lead
- UI: score badge color matches score range

**Verification:**
- Frontend tests pass: `npm run test` or equivalent Vitest command
- Manual: load `/admin/leads` in browser with HTTP basic auth
- Lead card matches the spec's admin lead card format

---

## System-Wide Impact

- **Interaction graph:** `LeadDiscoveryPipelineJob` calls `DiscogsClient` (existing), creates `Lead` records (new model), and has an "onboard" action path into `StoreOnboarding` (existing) which creates `Store` records and triggers `FullStoreSyncJob`.
- **Error propagation:** Discover/scoring errors are isolated per seller (logged, not raised). The pipeline job's outer rescue catches unexpected errors, logs them, and allows the job to complete (partial success). Onboarding errors propagate from `StoreOnboarding` to the admin controller flash.
- **State lifecycle risks:** `Lead` records are idempotent — re-running the pipeline updates existing records rather than duplicating. The `scored_at` and `discovery_batch` fields prevent re-processing. The status enum prevents re-onboarding a dismissed lead.
- **API surface parity:** No public API changes. Admin routes are behind HTTP basic auth. No new external endpoints.
- **Integration coverage:** The full pipeline flow (discover → score → web check) is tested at the job level. The onboard action (lead → store) is tested at the request level. Unit tests cover scoring dimensions and web presence checking individually.
- **Unchanged invariants:** Existing Store onboarding flow is unchanged. `Lead` is an independent table — no schema changes to existing models. `StoreOnboarding` already handles the case where a Store exists for a username (raises error), which the admin controller catches.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Discogs API rate limits during discovery | Use same rate-limit handling as `EnrichmentService` (sleep between requests, pause when remaining is low). Run discovery as a low-priority recurring job at 2am. Consider adding a per-run cap (e.g., max 50 new sellers per run). |
| Web presence checking being too slow for many leads | Run web presence checks as a separate batch per lead with timeout per URL. Use HEAD requests only (no page content fetching). Consider deferring to a separate job if latency becomes an issue. |
| False positives in web presence detection (hitting unrelated sites) | Use strict domain matching. Classify carefully — only flag known ecommerce platforms. Keep the raw URLs in `web_presence` jsonb so admin can verify. |
| Lead data going stale (inventory changes, seller goes out of business) | Pipeline re-discovers and updates existing leads on each run. The `scored_at` timestamp shows data freshness. |
| Scoring calibration off-target | V1 filter criteria from the spec provide a safety net. The score breakdown is transparent in the admin card. Manual review of borderline cases is expected (spec: "manually review the borderline cases"). |

---

## Documentation / Operational Notes

- The lead discovery pipeline runs daily at 2am. It can also be triggered manually from the Rails console: `LeadDiscoveryPipelineJob.perform_later`
- Lead data is read-only for the system (discovery pipeline writes it). Admin actions (review, dismiss, onboard) are the only mutation paths.
- Web presence check results are cached in the `lead.web_presence` jsonb field. They are refreshed on each pipeline run.
- Monitor for Discogs API rate limit errors in Honeybadger. If discovery consistently hits rate limits, increase the sleep interval or reduce per-run cap.
- Consider adding a `MAX_NEW_LEADS_PER_RUN` constant in the pipeline job to control batch size during initial ramp-up.

---

## Sources & References

- **Origin document:** User-provided spec for lead generation system (this plan's inline description)
- **Related plans:** `docs/plans/2026-05-16-001-feat-admin-dashboard-workflow-plan.md` — admin dashboard workflow that lead review UI should integrate with
- **Related brainstorms:** `docs/brainstorms/2026-05-15-404-discogs-seller-invitation-requirements.md` — seller discovery and web presence detection patterns
- **Related solutions:**
  - `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` — scoring engine architecture
  - `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` — admin surface conventions
- **Key services to follow:**
  - `app/services/discogs_client.rb` — existing Discogs API integration
  - `app/services/store_sync_service.rb` — pipeline pattern
  - `app/services/store_onboarding.rb` — lead-to-store conversion
  - `app/services/enrichment_service.rb` — rate-limit handling
  - `app/models/record_scorer.rb` — scoring engine pattern
