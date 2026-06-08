require "rails_helper"

RSpec.describe DashboardPresenter do
  it "exposes store status without raw error details or owner credentials" do
    owner = create(:store_owner, owner_email: "owner@example.com")
    store = create(
      :store,
      store_owner: owner,
      sync_status: "failed",
      last_sync_error: "RuntimeError: Discogs timeout\napp/jobs/full_store_sync_job.rb:12:in `perform'",
      last_sync_error_at: 1.hour.ago
    )

    props = described_class.new(store).props[:store]

    expect(props).to include(
      id: store.id,
      name: store.name,
      discogs_username: store.discogs_username,
      storefront_url: "/#{store.discogs_username}",
      last_sync_error_at: store.last_sync_error_at,
      oauth_authorized_at: store.oauth_authorized_at
    )
    expect(props).not_to include(:owner_email, :last_sync_error, :last_sync_error_summary,
      :discogs_oauth_token, :discogs_oauth_token_secret)
  end
end
