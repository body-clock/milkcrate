require "rails_helper"

RSpec.describe ListingEvent do
  let(:store) { create(:store, name: "Test Store", discogs_username: "test-store", sync_status: "idle") }
  let(:listing) { create(:listing, store:, genres: [], styles: []) }

  it "accepts known event types" do
    event = described_class.new(store:, listing:, event_type: "record_view")

    expect(event).to be_valid
  end

  it "rejects unknown event types" do
    event = described_class.new(store:, listing:, event_type: "unknown")

    expect(event).not_to be_valid
  end
end
