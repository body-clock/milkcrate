require "rails_helper"

RSpec.describe Admin::DashboardPresenter do
  it "returns active stores with health summaries" do
    healthy = create(:store, name: "Healthy Store", discogs_username: "healthy-store")
    processing = create(:store,
      name: "Processing Store",
      discogs_username: "processing-store",
      sync_status: "syncing",
      last_synced_at: nil,
      last_enriched_at: nil,
      catalog_coverage: "unknown"
    )

    props = described_class.new.props

    expect(props[:active_stores].map { |store| store[:name] }).to include("Healthy Store", "Processing Store")
    healthy_props = props[:active_stores].find { |store| store[:id] == healthy.id }
    processing_props = props[:active_stores].find { |store| store[:id] == processing.id }
    expect(healthy_props[:health][:key]).to eq("healthy")
    expect(processing_props[:health][:key]).to eq("processing")
  end

  it "returns applicants without a matching store ordered by most recent first" do
    create(:store, discogs_username: "already-live")
    create(:waitlist, name: "Already Live", discogs_username: "already-live", created_at: 1.hour.ago)
    older = create(:waitlist, name: "Older Applicant", discogs_username: "older-applicant", created_at: 2.days.ago)
    newer = create(:waitlist, name: "Newer Applicant", discogs_username: "newer-applicant", created_at: 1.day.ago)

    applicants = described_class.new.props[:applicants]

    expect(applicants.map { |applicant| applicant[:id] }).to eq([ newer.id, older.id ])
    expect(applicants.map { |applicant| applicant[:name] }).not_to include("Already Live")
  end

  it "includes all applicant fields needed by the dashboard" do
    waitlist = create(:waitlist,
      name: "Applicant Store",
      email: "applicant@example.com",
      discogs_username: "applicant-store",
      inventory_size: "500_2000",
      notes: "Strong jazz inventory."
    )

    applicant = described_class.new.props[:applicants].find { |entry| entry[:id] == waitlist.id }

    expect(applicant).to include(
      id: waitlist.id,
      name: "Applicant Store",
      email: "applicant@example.com",
      discogs_username: "applicant-store",
      inventory_size: "500_2000",
      notes: "Strong jazz inventory."
    )
    expect(applicant[:submitted_at]).to be_present
  end

  it "includes Discogs onboarding action paths" do
    props = described_class.new.props

    expect(props[:discogs_onboarding]).to eq(
      lookup_path: "/admin/discogs_lookup",
      create_path: "/admin/onboarding"
    )
  end

  it "sorts active stores by health severity with failed stores first" do
    healthy = create(:store,
      name: "Healthy Store",
      discogs_username: "healthy-store",
      last_synced_at: 1.hour.ago,
      last_enriched_at: 1.hour.ago
    )
    failed = create(:store,
      name: "Failed Store",
      discogs_username: "failed-store",
      sync_status: "failed",
      last_sync_error: "Discogs timeout",
      last_sync_error_at: 30.minutes.ago,
      last_synced_at: 2.hours.ago,
      last_enriched_at: 1.hour.ago
    )
    processing = create(:store,
      name: "Processing Store",
      discogs_username: "processing-store",
      sync_status: "syncing",
      last_synced_at: nil,
      last_enriched_at: nil
    )
    stale = create(:store,
      name: "Stale Store",
      discogs_username: "stale-store",
      last_synced_at: 2.days.ago,
      last_enriched_at: 1.hour.ago
    )

    store_names = described_class.new.props[:active_stores].map { |s| s[:name] }

    expect(store_names).to eq([ "Failed Store", "Stale Store", "Processing Store", "Healthy Store" ])
  end

  it "sorts failed stores by most recently failed first" do
    failed_older = create(:store,
      name: "Failed Older",
      discogs_username: "failed-older",
      sync_status: "failed",
      last_sync_error: "Timeout",
      last_sync_error_at: 2.hours.ago,
      last_synced_at: 3.hours.ago,
      last_enriched_at: 1.hour.ago
    )
    failed_newer = create(:store,
      name: "Failed Newer",
      discogs_username: "failed-newer",
      sync_status: "failed",
      last_sync_error: "API error",
      last_sync_error_at: 10.minutes.ago,
      last_synced_at: 1.hour.ago,
      last_enriched_at: 1.hour.ago
    )

    store_names = described_class.new.props[:active_stores].map { |s| s[:name] }

    expect(store_names).to eq([ "Failed Newer", "Failed Older" ])
  end

  it "sorts healthy stores by most overdue first" do
    healthy_recent = create(:store,
      name: "Healthy Recent",
      discogs_username: "healthy-recent",
      last_synced_at: 1.hour.ago,
      last_enriched_at: 1.hour.ago
    )
    healthy_overdue = create(:store,
      name: "Healthy Overdue",
      discogs_username: "healthy-overdue",
      last_synced_at: 22.hours.ago,
      last_enriched_at: 22.hours.ago
    )

    store_names = described_class.new.props[:active_stores].map { |s| s[:name] }

    expect(store_names).to eq([ "Healthy Overdue", "Healthy Recent" ])
  end

  it "returns empty array when no stores exist" do
    expect(described_class.new.props[:active_stores]).to eq([])
  end
end
