require "rails_helper"

RSpec.describe Admin::StoreHealth do
  include ActiveSupport::Testing::TimeHelpers

  around do |example|
    travel_to(Time.zone.parse("2026-05-16 12:00:00")) { example.run }
  end

  def health_for(store)
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
      severity: "good",
      reasons: [ "Sync and enrichment are current" ]
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
      severity: "danger",
      reasons: [ "Sync failed" ],
      has_sync_error: true,
      last_sync_error_summary: "Discogs timeout"
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
      severity: "danger",
      reasons: [ "Enrichment failed" ]
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
      severity: "working",
      reasons: [ "Sync in progress" ]
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
      severity: "working",
      reasons: [ "Enrichment in progress" ]
    )
  end

  it "marks stores with missing readiness as processing" do
    store = build_stubbed(:store,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "unknown",
      last_synced_at: nil,
      last_enriched_at: nil
    )

    expect(health_for(store)).to include(
      key: "processing",
      severity: "working",
      reasons: [ "Waiting on first sync", "Waiting on first enrichment" ]
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
      severity: "warning",
      reasons: [ "Sync is stale" ]
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
      severity: "warning",
      reasons: [ "Inventory coverage is partial" ]
    )
  end
end
