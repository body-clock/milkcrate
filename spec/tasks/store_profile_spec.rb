require "rails_helper"
require "rake"

RSpec.describe "store_profile" do
  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    Rake::Task["store_profile:sync_all"]&.reenable
    Rake::Task["store_profile:sync_one"]&.reenable
  end

  describe "store_profile:sync_all" do
    it "enqueues StoreProfileSyncJob for each store" do
      create_list(:store, 3)

      expect {
        Rake::Task["store_profile:sync_all"].invoke
      }.to have_enqueued_job(StoreProfileSyncJob).exactly(3).times
    end

    it "handles no stores gracefully" do
      expect {
        Rake::Task["store_profile:sync_all"].invoke
      }.not_to raise_error
    end
  end

  describe "store_profile:sync_one" do
    it "syncs profile data for the specified store" do
      store = create(:store, discogs_username: "test_store")
      client = instance_double(DiscogsClient)
      allow(DiscogsClient).to receive(:new).and_return(client)
      allow(client).to receive(:seller_profile).with("test_store").and_return({
        "avatar_url" => "https://example.com/avatar.jpg",
        "location" => "Brooklyn, NY",
        "profile" => "We sell punk records"
      })

      Rake::Task["store_profile:sync_one"].invoke("test_store")

      store.reload
      expect(store.avatar_url).to eq("https://example.com/avatar.jpg")
      expect(store.location).to eq("Brooklyn, NY")
      expect(store.genre_tags).to contain_exactly("punk")
    end

    it "exits with error when store not found" do
      expect {
        Rake::Task["store_profile:sync_one"].invoke("nonexistent")
      }.to raise_error(SystemExit)
    end
  end
end
