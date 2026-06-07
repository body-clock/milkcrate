require "rails_helper"

RSpec.describe StoreOperations::DeleteStore do
  describe ".call" do
    # -- AE5: Exact confirmation deletes the selected inactive store --
    it "deletes the store when the confirmation matches exactly" do
      store = create(:store, discogs_username: "test-store")

      result = described_class.call(store.id, confirmation: "test-store")

      expect(result.outcome).to eq(:deleted)
      expect(Store.find_by(id: store.id)).to be_nil
    end

    # -- AE5: Case difference, surrounding whitespace, empty input --
    it "does not delete when confirmation has wrong case" do
      store = create(:store, discogs_username: "test-store")

      result = described_class.call(store.id, confirmation: "Test-Store")

      expect(result.outcome).to eq(:mismatch)
      expect(Store.find_by(id: store.id)).to be_present
    end

    it "does not delete when confirmation has leading whitespace" do
      store = create(:store, discogs_username: "test-store")

      result = described_class.call(store.id, confirmation: " test-store")

      expect(result.outcome).to eq(:mismatch)
      expect(Store.find_by(id: store.id)).to be_present
    end

    it "does not delete when confirmation has trailing whitespace" do
      store = create(:store, discogs_username: "test-store")

      result = described_class.call(store.id, confirmation: "test-store ")

      expect(result.outcome).to eq(:mismatch)
      expect(Store.find_by(id: store.id)).to be_present
    end

    it "does not delete when confirmation is empty" do
      store = create(:store, discogs_username: "test-store")

      result = described_class.call(store.id, confirmation: "")

      expect(result.outcome).to eq(:mismatch)
      expect(Store.find_by(id: store.id)).to be_present
    end

    it "does not delete when confirmation is another store's username" do
      store = create(:store, discogs_username: "store-alpha")
      create(:store, discogs_username: "store-beta")

      result = described_class.call(store.id, confirmation: "store-beta")

      expect(result.outcome).to eq(:mismatch)
      expect(Store.find_by(id: store.id)).to be_present
    end

    # -- AE6: Store, listings, and order events are removed together --
    it "removes listings and order events with the store" do
      store = create(:store, discogs_username: "full-store")
      listing = create(:listing, store:)
      order_event = create(:discogs_order_event, store:)

      result = described_class.call(store.id, confirmation: "full-store")

      expect(result.outcome).to eq(:deleted)
      expect(Listing.find_by(id: listing.id)).to be_nil
      expect(DiscogsOrderEvent.find_by(id: order_event.id)).to be_nil
    end

    # -- AE6: Unshared owner and encrypted credentials are removed --
    it "removes the owner when no other stores reference it" do
      owner = create(:store_owner)
      store = create(:store, store_owner: owner, discogs_username: "only-store")

      result = described_class.call(store.id, confirmation: "only-store")

      expect(result.outcome).to eq(:deleted)
      expect(StoreOwner.find_by(id: owner.id)).to be_nil
    end

    # -- AE7: Shared owner and credentials remain --
    it "preserves the owner when another store references it" do
      owner = create(:store_owner)
      store = create(:store, store_owner: owner, discogs_username: "store-a")
      create(:store, store_owner: owner, discogs_username: "store-b")

      result = described_class.call(store.id, confirmation: "store-a")

      expect(result.outcome).to eq(:deleted)
      expect(StoreOwner.find_by(id: owner.id)).to be_present
      expect(Store.find_by(discogs_username: "store-b")).to be_present
    end

    # -- AE10: Active sync or enrichment blocks deletion --
    it "rejects deletion when sync is active" do
      store = create(:store, discogs_username: "syncing-store", sync_status: :syncing)

      result = described_class.call(store.id, confirmation: "syncing-store")

      expect(result.outcome).to eq(:active)
      expect(Store.find_by(id: store.id)).to be_present
    end

    it "rejects deletion when enrichment is active" do
      store = create(:store, discogs_username: "enriching-store", enrichment_status: :enriching)

      result = described_class.call(store.id, confirmation: "enriching-store")

      expect(result.outcome).to eq(:active)
      expect(Store.find_by(id: store.id)).to be_present
    end

    # -- Missing store path --
    it "returns missing when the store does not exist" do
      result = described_class.call(99999, confirmation: "anything")

      expect(result.outcome).to eq(:missing)
    end

    # -- Transaction rollback on failure --
    it "rolls back the store deletion when dependent destruction fails" do
      store = create(:store, discogs_username: "rollback-store")
      listing = create(:listing, store:)

      # Simulate a failure during destruction by stubbing
      allow_any_instance_of(Store).to receive(:destroy!).and_raise(ActiveRecord::RecordNotDestroyed)

      result = described_class.call(store.id, confirmation: "rollback-store")

      expect(result.outcome).to eq(:failed)
      expect(Store.find_by(id: store.id)).to be_present
      expect(Listing.find_by(id: listing.id)).to be_present
    end

    it "rolls back when owner destruction fails" do
      owner = create(:store_owner)
      store = create(:store, store_owner: owner, discogs_username: "owner-store")

      allow_any_instance_of(StoreOwner).to receive(:destroy!).and_raise(ActiveRecord::RecordNotDestroyed)

      result = described_class.call(store.id, confirmation: "owner-store")

      expect(result.outcome).to eq(:failed)
      expect(Store.find_by(id: store.id)).to be_present
      expect(StoreOwner.find_by(id: owner.id)).to be_present
    end
  end
end
