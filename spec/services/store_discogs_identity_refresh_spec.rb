require "rails_helper"

RSpec.describe StoreDiscogsIdentityRefresh do
  def stub_discogs_profile(username, profile:)
    client = instance_double(DiscogsClient)
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:seller_profile).with(username).and_return(profile)
    client
  end

  describe ".call" do
    it "populates discogs_user_id from a valid seller profile" do
      store = create(:store, discogs_username: "teststore", discogs_user_id: nil)
      stub_discogs_profile("teststore", profile: { "id" => 4_616_786, "name" => "Test Store" })

      result = described_class.call(store:)

      expect(result).to be_success
      expect(store.reload.discogs_user_id).to eq(4_616_786)
    end

    it "updates an existing discogs_user_id" do
      store = create(:store, discogs_username: "existing", discogs_user_id: 1_111_111)
      stub_discogs_profile("existing", profile: { "id" => 2_222_222, "name" => "Existing Store" })

      result = described_class.call(store:)

      expect(result).to be_success
      expect(store.reload.discogs_user_id).to eq(2_222_222)
    end

    it "returns failure when profile has no numeric id" do
      store = create(:store, discogs_username: "noid", discogs_user_id: nil)
      stub_discogs_profile("noid", profile: { "name" => "No ID Store" })

      result = described_class.call(store:)

      expect(result).not_to be_success
      expect(result.error).to match(/no usable numeric ID/)
      expect(store.reload.discogs_user_id).to be_nil
    end

    it "returns failure when profile id is not an integer" do
      store = create(:store, discogs_username: "stringid", discogs_user_id: nil)
      stub_discogs_profile("stringid", profile: { "id" => "some_string", "name" => "String ID Store" })

      result = described_class.call(store:)

      expect(result).not_to be_success
      expect(result.error).to match(/no usable numeric ID/)
      expect(store.reload.discogs_user_id).to be_nil
    end

    it "returns failure when Discogs API errors" do
      store = create(:store, discogs_username: "broken", discogs_user_id: nil)
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("broken")
        .and_raise(DiscogsClient::ApiError, "not found")

      result = described_class.call(store:)

      expect(result).not_to be_success
      expect(result.error).to match(/Discogs profile lookup failed/)
      expect(store.reload.discogs_user_id).to be_nil
    end

    it "does not overwrite discogs_user_id on failure" do
      store = create(:store, discogs_username: "existing", discogs_user_id: 5_555_555)
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("existing")
        .and_raise(DiscogsClient::ApiError, "API unavailable")

      described_class.call(store:)

      expect(store.reload.discogs_user_id).to eq(5_555_555)
    end
  end
end
