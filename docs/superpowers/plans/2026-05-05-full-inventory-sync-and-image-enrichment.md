# Full Inventory Sync and Image Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the full philadelphiamusic Discogs inventory (not just the newest 10k items), track which releases have no Discogs image, and fall back to MusicBrainz Cover Art Archive for those releases.

**Architecture:** Three sequential changes — (1) two-pass sync (desc + asc sort order) to cover both ends of a 23k-item store within the 100-page API limit, (2) a `discogs_image_missing` flag set during enrichment when Discogs returns no image, (3) a new `EnrichMusicBrainzImagesJob` that searches MusicBrainz and fetches cover art for confirmed-imageless releases.

**Tech Stack:** Ruby on Rails 8, SolidQueue, Faraday, Discogs API (existing), MusicBrainz API (new, no auth), Cover Art Archive (new, no auth).

---

## File Map

**Modified:**
- `app/services/store_sync_service.rb` — add `sort_order:` param to `full_sync`
- `app/jobs/full_store_sync_job.rb` — call `full_sync` twice (desc + asc)
- `app/jobs/enrich_releases_job.rb` — set `discogs_image_missing` flag; enqueue `EnrichMusicBrainzImagesJob` at end
- `spec/jobs/full_store_sync_job_spec.rb` — update existing + new two-pass tests
- `spec/services/store_sync_service_spec.rb` — add `sort_order:` tests
- `spec/jobs/enrich_releases_job_spec.rb` — add `discogs_image_missing` tests

**Created:**
- `db/migrate/TIMESTAMP_add_discogs_image_missing_to_releases.rb`
- `db/migrate/TIMESTAMP_add_musicbrainz_id_to_releases.rb`
- `app/services/music_brainz_client.rb`
- `app/jobs/enrich_music_brainz_images_job.rb`
- `spec/services/music_brainz_client_spec.rb`
- `spec/jobs/enrich_music_brainz_images_job_spec.rb`

---

## Task 1: Two-Pass Sync

**Files:**
- Modify: `app/services/store_sync_service.rb`
- Modify: `app/jobs/full_store_sync_job.rb`
- Test: `spec/services/store_sync_service_spec.rb`
- Test: `spec/jobs/full_store_sync_job_spec.rb`

- [ ] **Step 1: Write failing tests for sort_order support**

In `spec/services/store_sync_service_spec.rb`, add inside `describe "#full_sync"`:

```ruby
it "passes sort_order to the inventory client" do
  allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))
  StoreSyncService.new(store).full_sync(sort_order: "asc")
  expect(client).to have_received(:seller_inventory).with("teststore", page: 1, sort_order: "asc")
end

it "defaults sort_order to desc" do
  allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))
  StoreSyncService.new(store).full_sync
  expect(client).to have_received(:seller_inventory).with("teststore", page: 1, sort_order: "desc")
end
```

In `spec/jobs/full_store_sync_job_spec.rb`, replace the existing `"calls StoreSyncService#full_sync"` test and add:

```ruby
it "calls full_sync twice — desc then asc" do
  described_class.new.perform(store.id)
  expect(sync_service).to have_received(:full_sync).with(hash_including(sort_order: "desc")).ordered
  expect(sync_service).to have_received(:full_sync).with(hash_including(sort_order: "asc")).ordered
end

it "passes max_pages to both passes when provided" do
  described_class.new.perform(store.id, max_pages: 1)
  expect(sync_service).to have_received(:full_sync).with(max_pages: 1, sort_order: "desc")
  expect(sync_service).to have_received(:full_sync).with(max_pages: 1, sort_order: "asc")
end
```

Remove the old `"calls StoreSyncService#full_sync"` and `"passes max_pages when provided"` tests — the new ones replace them.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bundle exec rspec spec/services/store_sync_service_spec.rb spec/jobs/full_store_sync_job_spec.rb
```

Expected: failures on the new sort_order tests.

- [ ] **Step 3: Add `sort_order:` param to `StoreSyncService#full_sync`**

In `app/services/store_sync_service.rb`, change the method signature and the inventory call:

```ruby
def full_sync(max_pages: nil, sort_order: "desc")
  @store.update!(sync_status: "syncing")
  page = 1
  total_imported = 0

  loop do
    data = @client.seller_inventory(@store.discogs_username, page: page, sort_order: sort_order)
    # rest of method unchanged
```

- [ ] **Step 4: Update `FullStoreSyncJob` to call full_sync twice**

Replace `app/jobs/full_store_sync_job.rb` with:

```ruby
class FullStoreSyncJob < ApplicationJob
  queue_as :default

  def perform(store_id, max_pages: nil)
    store = Store.find(store_id)
    service = StoreSyncService.new(store)

    count_desc = service.full_sync(max_pages: max_pages, sort_order: "desc")
    count_asc  = service.full_sync(max_pages: max_pages, sort_order: "asc")

    Rails.logger.info("FullStoreSync: imported #{count_desc + count_asc} listings for #{store.discogs_username}")

    EnrichReleasesJob.perform_later(store_id)
    DailyCurationJob.perform_later(store_id)
  end
end
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
bundle exec rspec spec/services/store_sync_service_spec.rb spec/jobs/full_store_sync_job_spec.rb
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/services/store_sync_service.rb app/jobs/full_store_sync_job.rb \
        spec/services/store_sync_service_spec.rb spec/jobs/full_store_sync_job_spec.rb
git commit -m "feat: two-pass sync to cover full Discogs inventory"
```

---

## Task 2: Migration — `discogs_image_missing`

**Files:**
- Create: `db/migrate/TIMESTAMP_add_discogs_image_missing_to_releases.rb`

- [ ] **Step 1: Generate migration**

```bash
bin/rails generate migration AddDiscogsImageMissingToReleases discogs_image_missing:boolean
```

- [ ] **Step 2: Edit migration to set default and null constraint**

Open the generated file (e.g. `db/migrate/20260505000001_add_discogs_image_missing_to_releases.rb`) and ensure it reads:

```ruby
class AddDiscogsImageMissingToReleases < ActiveRecord::Migration[8.0]
  def change
    add_column :releases, :discogs_image_missing, :boolean, default: false, null: false
  end
end
```

- [ ] **Step 3: Run migration**

```bash
bin/rails db:migrate
```

Expected output includes: `add_column(:releases, :discogs_image_missing, :boolean, ...)`

- [ ] **Step 4: Confirm schema**

```bash
grep -A 12 'create_table "releases"' db/schema.rb
```

Expected: `discogs_image_missing` column present with `default: false`.

- [ ] **Step 5: Commit**

```bash
git add db/migrate/ db/schema.rb
git commit -m "feat: add discogs_image_missing to releases"
```

---

## Task 3: Track `discogs_image_missing` in EnrichReleasesJob

**Files:**
- Modify: `app/jobs/enrich_releases_job.rb`
- Test: `spec/jobs/enrich_releases_job_spec.rb`

- [ ] **Step 1: Write failing tests**

In `spec/jobs/enrich_releases_job_spec.rb`, add these tests. The existing `before` block stubs `client.release` returning `"images" => []` — those releases have no image. Add:

```ruby
it "sets discogs_image_missing true when Discogs returns no images" do
  listing = create_listing(store:, release_id: "111")
  described_class.new.perform(store.id)
  expect(Release.find_by(discogs_release_id: "111").discogs_image_missing).to be true
end

it "sets discogs_image_missing false when Discogs returns an image" do
  allow(client).to receive(:release).with("111").and_return(
    [ {
      "community" => { "want" => 1, "have" => 1 },
      "genres" => [], "styles" => [], "formats" => [], "tracklist" => [],
      "images" => [ { "type" => "primary", "uri" => "https://img.discogs.com/cover.jpg" } ]
    }, 50 ]
  )
  create_listing(store:, release_id: "111")
  described_class.new.perform(store.id)
  expect(Release.find_by(discogs_release_id: "111").discogs_image_missing).to be false
end
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bundle exec rspec spec/jobs/enrich_releases_job_spec.rb
```

Expected: new tests fail with `NoMethodError` or column missing.

- [ ] **Step 3: Update `enrich_release` to write `discogs_image_missing`**

In `app/jobs/enrich_releases_job.rb`, find the `Release.upsert` call inside `enrich_release` and update it:

```ruby
now = Time.current
Release.upsert(
  { discogs_release_id: discogs_release_id, want_count: want, have_count: have,
    enriched_at: now, discogs_image_missing: cover_url.nil?, created_at: now, updated_at: now },
  unique_by: :discogs_release_id,
  update_only: %i[want_count have_count enriched_at discogs_image_missing]
)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bundle exec rspec spec/jobs/enrich_releases_job_spec.rb
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/jobs/enrich_releases_job.rb spec/jobs/enrich_releases_job_spec.rb
git commit -m "feat: track discogs_image_missing on enrichment"
```

---

## Task 4: Migration — `musicbrainz_id`

**Files:**
- Create: `db/migrate/TIMESTAMP_add_musicbrainz_id_to_releases.rb`

- [ ] **Step 1: Generate migration**

```bash
bin/rails generate migration AddMusicbrainzIdToReleases musicbrainz_id:string
```

- [ ] **Step 2: Verify migration**

Open the generated file and confirm it reads:

```ruby
class AddMusicbrainzIdToReleases < ActiveRecord::Migration[8.0]
  def change
    add_column :releases, :musicbrainz_id, :string
  end
end
```

No default needed — `nil` is the sentinel for "not yet searched".

- [ ] **Step 3: Run migration**

```bash
bin/rails db:migrate
```

- [ ] **Step 4: Confirm schema**

```bash
grep -A 14 'create_table "releases"' db/schema.rb
```

Expected: `musicbrainz_id` column present with no default.

- [ ] **Step 5: Commit**

```bash
git add db/migrate/ db/schema.rb
git commit -m "feat: add musicbrainz_id to releases"
```

---

## Task 5: MusicBrainzClient Service

**Files:**
- Create: `app/services/music_brainz_client.rb`
- Create: `spec/services/music_brainz_client_spec.rb`

- [ ] **Step 1: Write failing tests**

Create `spec/services/music_brainz_client_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe MusicBrainzClient do
  let(:search_conn) { instance_double(Faraday::Connection) }
  let(:caa_conn)    { instance_double(Faraday::Connection) }
  let(:client) do
    described_class.new.tap do |c|
      c.instance_variable_set(:@search_conn, search_conn)
      c.instance_variable_set(:@caa_conn, caa_conn)
    end
  end

  describe "#search_release" do
    it "returns the MBID when score >= 90" do
      response = instance_double(Faraday::Response,
        status: 200,
        body: { "releases" => [ { "id" => "abc-123", "score" => 100 } ] })
      allow(search_conn).to receive(:get).and_yield(double(params: {})).and_return(response)
      expect(client.search_release(artist: "Miles Davis", title: "Kind of Blue")).to eq("abc-123")
    end

    it "returns nil when score < 90" do
      response = instance_double(Faraday::Response,
        status: 200,
        body: { "releases" => [ { "id" => "abc-123", "score" => 80 } ] })
      allow(search_conn).to receive(:get).and_yield(double(params: {})).and_return(response)
      expect(client.search_release(artist: "Miles Davis", title: "Kind of Blue")).to be_nil
    end

    it "returns nil when no results" do
      response = instance_double(Faraday::Response,
        status: 200,
        body: { "releases" => [] })
      allow(search_conn).to receive(:get).and_yield(double(params: {})).and_return(response)
      expect(client.search_release(artist: "Unknown", title: "Untitled")).to be_nil
    end
  end

  describe "#front_cover_url" do
    it "returns the redirect Location URL on 307" do
      response = instance_double(Faraday::Response,
        status: 307,
        headers: { "Location" => "https://archive.org/cover.jpg" })
      allow(caa_conn).to receive(:get).with("/release/abc-123/front").and_return(response)
      expect(client.front_cover_url("abc-123")).to eq("https://archive.org/cover.jpg")
    end

    it "returns nil on 404" do
      response = instance_double(Faraday::Response, status: 404, headers: {})
      allow(caa_conn).to receive(:get).with("/release/abc-123/front").and_return(response)
      expect(client.front_cover_url("abc-123")).to be_nil
    end
  end
end
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bundle exec rspec spec/services/music_brainz_client_spec.rb
```

Expected: `NameError: uninitialized constant MusicBrainzClient`

- [ ] **Step 3: Create `app/services/music_brainz_client.rb`**

```ruby
class MusicBrainzClient
  SEARCH_URL      = "https://musicbrainz.org/ws/2"
  CAA_URL         = "https://coverartarchive.org"
  SCORE_THRESHOLD = 90

  class ApiError < StandardError; end

  def initialize
    @search_conn = build_connection(SEARCH_URL)
    @caa_conn    = build_connection(CAA_URL)
  end

  def search_release(artist:, title:)
    response = @search_conn.get("/release/") do |req|
      req.params["query"] = "artist:\"#{artist}\" AND release:\"#{title}\""
      req.params["fmt"]   = "json"
      req.params["limit"] = 5
    end
    raise ApiError, "MusicBrainz error: #{response.status}" unless response.status == 200

    releases = response.body["releases"] || []
    best = releases.first
    return nil if best.nil? || best["score"].to_i < SCORE_THRESHOLD

    best["id"]
  end

  def front_cover_url(mbid)
    response = @caa_conn.get("/release/#{mbid}/front")
    case response.status
    when 307, 302
      response.headers["Location"]
    when 404
      nil
    else
      raise ApiError, "CAA error: #{response.status}"
    end
  end

  private

  def build_connection(url)
    Faraday.new(url: url) do |f|
      f.options.timeout = 10
      f.options.open_timeout = 5
      f.response :json
      f.headers["User-Agent"] = "Milkcrate/1.0 +https://milkcrate.fm"
    end
  end
end
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bundle exec rspec spec/services/music_brainz_client_spec.rb
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/services/music_brainz_client.rb spec/services/music_brainz_client_spec.rb
git commit -m "feat: add MusicBrainzClient service"
```

---

## Task 6: EnrichMusicBrainzImagesJob

**Files:**
- Create: `app/jobs/enrich_music_brainz_images_job.rb`
- Create: `spec/jobs/enrich_music_brainz_images_job_spec.rb`

- [ ] **Step 1: Write failing tests**

Create `spec/jobs/enrich_music_brainz_images_job_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe EnrichMusicBrainzImagesJob do
  let(:mb_client) { instance_double(MusicBrainzClient) }
  let(:store)     { create(:store, name: "Test Store", discogs_username: "teststore") }

  before do
    allow(MusicBrainzClient).to receive(:new).and_return(mb_client)
    allow(described_class).to receive(:sleep)
    allow_any_instance_of(described_class).to receive(:sleep)
  end

  def create_imageless_listing(release_id:)
    listing = create(:listing, store:, discogs_release_id: release_id,
                     cover_image_url: "https://thumb.jpg", thumbnail_url: "https://thumb.jpg")
    Release.create!(discogs_release_id: release_id, discogs_image_missing: true,
                    enriched_at: 1.day.ago)
    listing
  end

  it "updates cover_image_url and musicbrainz_id when match and cover found" do
    listing = create_imageless_listing(release_id: "111")
    allow(mb_client).to receive(:search_release).with(artist: listing.artist, title: listing.title)
                                                .and_return("mbid-abc")
    allow(mb_client).to receive(:front_cover_url).with("mbid-abc")
                                                 .and_return("https://archive.org/cover.jpg")

    described_class.new.perform(store.id)

    expect(listing.reload.cover_image_url).to eq("https://archive.org/cover.jpg")
    expect(Release.find_by(discogs_release_id: "111").musicbrainz_id).to eq("mbid-abc")
  end

  it "stores musicbrainz_id but leaves cover unchanged when MBID found but no CAA image" do
    listing = create_imageless_listing(release_id: "111")
    allow(mb_client).to receive(:search_release).and_return("mbid-abc")
    allow(mb_client).to receive(:front_cover_url).with("mbid-abc").and_return(nil)

    described_class.new.perform(store.id)

    expect(listing.reload.cover_image_url).to eq("https://thumb.jpg")
    expect(Release.find_by(discogs_release_id: "111").musicbrainz_id).to eq("mbid-abc")
  end

  it "writes empty string to musicbrainz_id when no MusicBrainz match" do
    create_imageless_listing(release_id: "111")
    allow(mb_client).to receive(:search_release).and_return(nil)

    described_class.new.perform(store.id)

    expect(Release.find_by(discogs_release_id: "111").musicbrainz_id).to eq("")
  end

  it "skips releases already searched (musicbrainz_id not nil)" do
    create_imageless_listing(release_id: "111")
    Release.find_by(discogs_release_id: "111").update!(musicbrainz_id: "already-done")

    described_class.new.perform(store.id)

    expect(mb_client).not_to have_received(:search_release)
  end

  it "skips releases where discogs_image_missing is false" do
    listing = create(:listing, store:, discogs_release_id: "222",
                     cover_image_url: "https://full.jpg", thumbnail_url: "https://thumb.jpg")
    Release.create!(discogs_release_id: "222", discogs_image_missing: false, enriched_at: 1.day.ago)

    described_class.new.perform(store.id)

    expect(mb_client).not_to have_received(:search_release)
  end
end
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bundle exec rspec spec/jobs/enrich_music_brainz_images_job_spec.rb
```

Expected: `NameError: uninitialized constant EnrichMusicBrainzImagesJob`

- [ ] **Step 3: Create `app/jobs/enrich_music_brainz_images_job.rb`**

```ruby
class EnrichMusicBrainzImagesJob < ApplicationJob
  queue_as :default

  RATE_LIMIT_SLEEP = 1.0

  def perform(store_id)
    store  = Store.find(store_id)
    client = MusicBrainzClient.new

    candidate_release_ids = store.listings
      .joins("INNER JOIN releases ON releases.discogs_release_id = listings.discogs_release_id")
      .where(releases: { discogs_image_missing: true, musicbrainz_id: nil })
      .distinct
      .pluck("listings.discogs_release_id")

    Rails.logger.info "[EnrichMusicBrainzImagesJob] #{candidate_release_ids.size} releases to search for store #{store.name}"

    candidate_release_ids.each do |discogs_release_id|
      listing = store.listings.find_by(discogs_release_id: discogs_release_id)
      next unless listing

      mbid = client.search_release(artist: listing.artist, title: listing.title)

      if mbid.nil?
        Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: "")
        sleep(RATE_LIMIT_SLEEP)
        next
      end

      cover_url = client.front_cover_url(mbid)

      Release.where(discogs_release_id: discogs_release_id).update_all(musicbrainz_id: mbid)

      if cover_url.present?
        store.listings
          .where(discogs_release_id: discogs_release_id)
          .update_all(cover_image_url: cover_url)
      end

      sleep(RATE_LIMIT_SLEEP)
    rescue MusicBrainzClient::ApiError => e
      Rails.logger.warn "[EnrichMusicBrainzImagesJob] API error for #{discogs_release_id}: #{e.message}"
    end
  end
end
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bundle exec rspec spec/jobs/enrich_music_brainz_images_job_spec.rb
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/jobs/enrich_music_brainz_images_job.rb spec/jobs/enrich_music_brainz_images_job_spec.rb
git commit -m "feat: add EnrichMusicBrainzImagesJob"
```

---

## Task 7: Wire EnrichMusicBrainzImagesJob into Chain

`EnrichMusicBrainzImagesJob` must run after `EnrichReleasesJob` completes (it needs `discogs_image_missing` to be set). The safest way: enqueue it from `EnrichReleasesJob` at the end of `perform`.

**Files:**
- Modify: `app/jobs/enrich_releases_job.rb`
- Test: `spec/jobs/enrich_releases_job_spec.rb`

- [ ] **Step 1: Write failing test**

In `spec/jobs/enrich_releases_job_spec.rb`, add:

```ruby
it "enqueues EnrichMusicBrainzImagesJob after enrichment" do
  create_listing(store:, release_id: "111")
  expect {
    described_class.new.perform(store.id)
  }.to have_enqueued_job(EnrichMusicBrainzImagesJob).with(store.id)
end
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
bundle exec rspec spec/jobs/enrich_releases_job_spec.rb -e "enqueues EnrichMusicBrainzImagesJob"
```

Expected: FAIL.

- [ ] **Step 3: Add enqueue at end of `EnrichReleasesJob#perform`**

In `app/jobs/enrich_releases_job.rb`, at the end of the `perform` method (after the `each_slice` block):

```ruby
    EnrichMusicBrainzImagesJob.perform_later(store_id)
  end
```

- [ ] **Step 4: Run full enrich job spec**

```bash
bundle exec rspec spec/jobs/enrich_releases_job_spec.rb
```

Expected: all pass.

- [ ] **Step 5: Run full suite to check for regressions**

```bash
bundle exec rspec
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/jobs/enrich_releases_job.rb spec/jobs/enrich_releases_job_spec.rb
git commit -m "feat: enqueue EnrichMusicBrainzImagesJob after Discogs enrichment"
```
