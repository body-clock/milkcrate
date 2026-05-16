require "rails_helper"

RSpec.describe Admin::StoreHealthPresenter do
  include ActiveSupport::Testing::TimeHelpers

  around do |example|
    travel_to(Time.zone.parse("2026-05-16 12:00:00")) { example.run }
  end

  def health_for(store)
    described_class.new(store).props[:health]
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
end
