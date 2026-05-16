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
end
