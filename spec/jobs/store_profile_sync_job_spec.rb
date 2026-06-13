require "rails_helper"

RSpec.describe StoreProfileSyncJob do
  let(:store) { create(:store, discogs_username: "test_store") }
  let(:client) { instance_double(DiscogsClient) }

  before do
    allow(DiscogsClient).to receive(:new).and_return(client)
  end

  describe "#perform" do
    let(:profile) do
      {
        "avatar_url" => "https://example.com/avatar.jpg",
        "location" => "Brooklyn, NY",
        "profile" => "We sell punk and jazz records"
      }
    end

    before do
      allow(client).to receive(:seller_profile).with("test_store").and_return(profile)
    end

    it "updates store with profile data" do
      described_class.perform_now(store.id)

      store.reload
      expect(store.avatar_url).to eq("https://example.com/avatar.jpg")
      expect(store.location).to eq("Brooklyn, NY")
      expect(store.description).to eq("We sell punk and jazz records")
      expect(store.genre_tags).to contain_exactly("punk", "jazz")
    end

    it "handles missing profile fields" do
      allow(client).to receive(:seller_profile).with("test_store").and_return({})

      described_class.perform_now(store.id)

      store.reload
      expect(store.avatar_url).to be_nil
      expect(store.location).to be_nil
      expect(store.description).to be_nil
      expect(store.genre_tags).to be_empty
    end

    it "logs warning on API error" do
      allow(client).to receive(:seller_profile).with("test_store").and_raise(
        Discogs::Errors::RateLimitError
      )

      expect { described_class.perform_now(store.id) }.not_to raise_error
    end
  end
end
