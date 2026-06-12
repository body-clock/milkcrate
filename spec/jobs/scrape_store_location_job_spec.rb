require "rails_helper"

RSpec.describe ScrapeStoreLocationJob do
  let(:store) { create(:store, discogs_username: "teststore") }
  let(:client) { instance_double(DiscogsClient) }

  before do
    allow(DiscogsClient).to receive(:new).and_return(client)
  end

  it "persists location from Discogs seller profile" do
    allow(client).to receive(:seller_profile).with("teststore")
      .and_return({ "location" => "Philadelphia, PA" })

    described_class.perform_now(store.id)

    expect(store.reload.location).to eq("Philadelphia, PA")
  end

  it "leaves location nil when profile has no location" do
    allow(client).to receive(:seller_profile).with("teststore")
      .and_return({ "location" => nil })

    described_class.perform_now(store.id)

    expect(store.reload.location).to be_nil
  end

  it "handles API errors gracefully" do
    allow(client).to receive(:seller_profile).with("teststore")
      .and_raise(DiscogsClient::ApiError.new("not found"))

    expect { described_class.perform_now(store.id) }.not_to raise_error
    expect(store.reload.location).to be_nil
  end

  it "skips stores with blank discogs_username" do
    store.update_column(:discogs_username, "")

    expect(client).not_to receive(:seller_profile)

    described_class.perform_now(store.id)
  end
end
