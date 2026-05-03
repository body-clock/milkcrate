require "rails_helper"
require Rails.root.join("db/migrate/20260503200001_drop_listing_events")

RSpec.describe DropListingEvents, type: :migration do
  it "does not fail when listing_events is already absent" do
    ActiveRecord::Base.connection.drop_table(:listing_events, if_exists: true)

    expect {
      described_class.suppress_messages { described_class.new.migrate(:up) }
    }.not_to raise_error
  end
end
