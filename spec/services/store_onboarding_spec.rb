require "rails_helper"

RSpec.describe StoreOnboarding do
  def stub_discogs_profile(username, name:)
    client = instance_double(DiscogsClient)
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:seller_profile).with(username).and_return({ "name" => name })
  end

  it "creates a store with the Discogs profile name" do
    stub_discogs_profile("teststore", name: "Test Store")

    result = described_class.call(discogs_username: "teststore")

    expect(result.store).to be_persisted
    expect(result.store.name).to eq("Test Store")
    expect(result.store.discogs_username).to eq("teststore")
  end

  it "falls back to username when the Discogs profile has no name" do
    stub_discogs_profile("nameless", name: nil)

    result = described_class.call(discogs_username: "nameless")

    expect(result.store.name).to eq("nameless")
  end

  it "queues a full store sync for the created store" do
    stub_discogs_profile("queued", name: "Queued Store")

    expect {
      described_class.call(discogs_username: "queued")
    }.to have_enqueued_job(FullStoreSyncJob)
  end

  it "does not mutate a source waitlist entry" do
    waitlist = create(:waitlist, discogs_username: "source-store")
    stub_discogs_profile("source-store", name: "Source Store")

    expect {
      described_class.call(discogs_username: "source-store", waitlist:)
    }.not_to change { waitlist.reload.attributes }
  end

  it "raises a usage error before calling Discogs when username is blank" do
    expect(DiscogsClient).not_to receive(:new)

    expect {
      described_class.call(discogs_username: "")
    }.to raise_error(StoreOnboarding::Error, /Discogs username is required/)
  end

  it "does not enqueue another sync when store already exists" do
    create(:store, discogs_username: "existing")
    stub_discogs_profile("existing", name: "Existing Store")

    expect {
      described_class.call(discogs_username: "existing")
    }.to raise_error(StoreOnboarding::Error, /already exists/)

    expect(Store.count).to eq(1)
  end

  it "does not create a store when Discogs lookup fails" do
    client = instance_double(DiscogsClient)
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:seller_profile).with("broken").and_raise(DiscogsClient::ApiError, "not found")

    expect {
      described_class.call(discogs_username: "broken")
    }.to raise_error(DiscogsClient::ApiError)

    expect(Store.count).to eq(0)
  end
end
