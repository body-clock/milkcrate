require "rails_helper"

RSpec.describe Store, type: :model do
  describe "normalize_discogs_username" do
    it "downcases discogs_username before validation" do
      store = build(:store, discogs_username: "MyUserName")
      store.validate
      expect(store.discogs_username).to eq("myusername")
    end

    it "preserves already lowercase discogs_username" do
      store = build(:store, discogs_username: "already-lower")
      store.validate
      expect(store.discogs_username).to eq("already-lower")
    end

    it "handles nil discogs_username without error" do
      store = build(:store, discogs_username: nil)
      expect { store.validate }.not_to raise_error
    end

    it "prevents casing-variant duplicates" do
      create(:store, discogs_username: "mystore")
      dup = build(:store, discogs_username: "MyStore")
      expect(dup).not_to be_valid
      expect(dup.errors[:discogs_username]).to include("has already been taken")
    end
  end

  describe ".with_discogs_username" do
    let!(:store) { create(:store, discogs_username: "teststore") }

    it "finds store by exact username" do
      expect(Store.with_discogs_username("teststore").first).to eq(store)
    end

    it "finds store by uppercase username" do
      expect(Store.with_discogs_username("TESTSTORE").first).to eq(store)
    end

    it "finds store by mixed-case username" do
      expect(Store.with_discogs_username("TestStore").first).to eq(store)
    end

    it "returns empty relation for non-existent username" do
      expect(Store.with_discogs_username("nonexistent").first).to be_nil
    end

    it "returns empty relation when no stores exist" do
      store.destroy!
      expect(Store.with_discogs_username("anything").first).to be_nil
    end
  end
end
