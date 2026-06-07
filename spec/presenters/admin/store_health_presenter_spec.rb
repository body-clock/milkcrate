require "rails_helper"

RSpec.describe Admin::StoreHealthPresenter do
  include ActiveSupport::Testing::TimeHelpers

  around do |example|
    travel_to(Time.zone.parse("2026-05-16 12:00:00")) { example.run }
  end

  def health_for(store)
    described_class.new(store).props[:health]
  end

  def props_for(store)
    described_class.new(store).props
  end

  it "marks a recently synced and enriched near-complete store as healthy" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: 2.hours.ago,
      last_enriched_at: 1.hour.ago,
      last_sync_error: nil,
      last_sync_error_at: nil
    )

    expect(health_for(store)).to include(
      key: "healthy",
      label: "Healthy",
      severity: "good"
    )
  end

  it "prioritizes failed sync over other signals" do
    store = build_stubbed(:store,
      sync_status: "failed",
      enrichment_status: "enriching",
      catalog_coverage: "partial",
      last_synced_at: 2.days.ago,
      last_sync_error: "Discogs timeout",
      last_sync_error_at: 10.minutes.ago
    )

    expect(health_for(store)).to include(
      key: "failed",
      label: "Needs attention",
      severity: "danger"
    )
  end

  it "prioritizes failed enrichment over stale or partial signals" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "failed",
      catalog_coverage: "partial",
      last_synced_at: 2.days.ago,
      last_enriched_at: 2.days.ago
    )

    expect(health_for(store)).to include(
      key: "failed",
      severity: "danger"
    )
  end

  it "marks syncing stores as processing even when timestamps are stale" do
    store = build_stubbed(:store,
      sync_status: "syncing",
      enrichment_status: "idle",
      catalog_coverage: "partial",
      last_synced_at: 3.days.ago,
      last_enriched_at: 3.days.ago
    )

    expect(health_for(store)).to include(
      key: "processing",
      label: "Processing",
      severity: "working"
    )
  end

  it "marks enriching stores as processing" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "enriching",
      catalog_coverage: "near_complete",
      last_synced_at: 1.hour.ago,
      last_enriched_at: 2.days.ago
    )

    expect(health_for(store)).to include(
      key: "processing",
      severity: "working"
    )
  end

  it "marks stores with missing sync readiness as pending" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "unknown",
      last_synced_at: nil,
      last_enriched_at: nil
    )

    expect(health_for(store)).to include(
      key: "processing",
      severity: "working"
    )
  end

  it "marks stale sync or enrichment timestamps as stale" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: 2.days.ago,
      last_enriched_at: 1.hour.ago
    )

    expect(health_for(store)).to include(
      key: "stale",
      label: "Stale",
      severity: "warning"
    )
  end

  it "marks partial catalog coverage as partial when no higher-priority signal exists" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "partial",
      last_synced_at: 1.hour.ago,
      last_enriched_at: 1.hour.ago
    )

    expect(health_for(store)).to include(
      key: "partial",
      label: "Partial coverage",
      severity: "warning"
    )
  end

  it "includes quick health metadata and concise reasons" do
    store = build_stubbed(:store,
      total_listings: 123,
      inventory_page_count: 4,
      sync_status: "failed",
      enrichment_status: "idle",
      catalog_coverage: "partial",
      last_synced_at: 2.hours.ago,
      last_enriched_at: 1.hour.ago,
      last_sync_error: "RuntimeError: Discogs timeout",
      last_sync_error_at: 30.minutes.ago
    )

    props = described_class.new(store).props

    expect(props).to include(
      total_listings: 123,
      inventory_page_count: 4,
      sync_status: "failed",
      enrichment_status: "idle",
      catalog_coverage: "partial"
    )
    expect(props[:health][:reasons]).to include("Sync failed")
    expect(props[:health][:has_sync_error]).to be true
  end

  describe "effective strategy and OAuth metadata" do
    it "reports Public API and disconnected when store has no owner" do
      store = build_stubbed(:store, store_owner: nil, sync_source: "public_api")

      props = props_for(store)

      expect(props).to include(
        effective_strategy: "Public API",
        oauth_connected: false
      )
    end

    it "reports Public API and disconnected when owner lacks credentials" do
      owner = build_stubbed(:store_owner,
        discogs_oauth_token: nil,
        discogs_oauth_token_secret: nil,
        oauth_authorized_at: nil
      )
      store = build_stubbed(:store, store_owner: owner, sync_source: "public_api")

      props = props_for(store)

      expect(props).to include(
        effective_strategy: "Public API",
        oauth_connected: false
      )
    end

    it "reports CSV Export and connected when owner has valid credentials" do
      owner = build_stubbed(:store_owner,
        discogs_oauth_token: "token",
        discogs_oauth_token_secret: "secret",
        oauth_authorized_at: Time.current
      )
      store = build_stubbed(:store, store_owner: owner, sync_source: "public_api")

      props = props_for(store)

      expect(props).to include(
        effective_strategy: "CSV Export",
        oauth_connected: true
      )
    end

    it "reports Public API when sync_source is csv_export but credentials are invalid" do
      owner = build_stubbed(:store_owner,
        discogs_oauth_token: nil,
        discogs_oauth_token_secret: nil,
        oauth_authorized_at: nil
      )
      store = build_stubbed(:store, store_owner: owner, sync_source: "csv_export")

      props = props_for(store)

      expect(props).to include(
        effective_strategy: "Public API",
        oauth_connected: false
      )
    end

    it "reports CSV Export when sync_source is public_api but credentials are valid" do
      owner = build_stubbed(:store_owner,
        discogs_oauth_token: "token",
        discogs_oauth_token_secret: "secret",
        oauth_authorized_at: Time.current
      )
      store = build_stubbed(:store, store_owner: owner, sync_source: "public_api")

      props = props_for(store)

      expect(props).to include(
        effective_strategy: "CSV Export",
        oauth_connected: true
      )
    end

    it "excludes OAuth tokens, secrets, owner email, and raw sync error from props" do
      owner = build_stubbed(:store_owner,
        discogs_oauth_token: "secret-token",
        discogs_oauth_token_secret: "secret-key",
        oauth_authorized_at: Time.current
      )
      store = build_stubbed(:store, store_owner: owner,
        last_sync_error: "RuntimeError: Discogs timeout\napp/jobs/full_store_sync_job.rb:12:in `perform'",
        last_sync_error_at: 30.minutes.ago)

      props = props_for(store)

      expect(props).not_to include(
        :discogs_oauth_token, :discogs_oauth_token_secret, :last_sync_error
      )
    end

    it "includes server-authored action paths scoped to store ID" do
      store = build_stubbed(:store)

      props = props_for(store)

      expect(props).to include(
        sync_path: "/admin/stores/#{store.id}/sync",
        enrich_path: "/admin/stores/#{store.id}/enrich",
        delete_path: "/admin/stores/#{store.id}"
      )
    end

    it "leaves existing health fields unchanged" do
      store = build_stubbed(:store,
        sync_status: "idle",
        enrichment_status: "idle",
        catalog_coverage: "near_complete",
        last_synced_at: 2.hours.ago,
        last_enriched_at: 1.hour.ago,
        last_sync_error: nil,
        last_sync_error_at: nil
      )

      props = props_for(store)

      expect(props[:health]).to include(
        key: "healthy", label: "Healthy", severity: "good"
      )
    end
  end
end
