require "rails_helper"

RSpec.describe DiscogsOrderEvent, type: :model do
  describe "validations" do
    it "is valid with valid attributes" do
      event = build(:discogs_order_event)
      expect(event).to be_valid
    end

    it "requires a store" do
      event = build(:discogs_order_event, store: nil)
      expect(event).not_to be_valid
      expect(event.errors[:store]).to include("must exist")
    end

    it "requires a discogs_order_id" do
      event = build(:discogs_order_event, discogs_order_id: nil)
      expect(event).not_to be_valid
      expect(event.errors[:discogs_order_id]).to include("can't be blank")
    end

    it "requires processed_at" do
      event = build(:discogs_order_event, processed_at: nil)
      expect(event).not_to be_valid
      expect(event.errors[:processed_at]).to include("can't be blank")
    end

    it "rejects duplicate discogs_order_id for the same store" do
      store = create(:store)
      create(:discogs_order_event, store: store, discogs_order_id: "order-123")

      duplicate = build(:discogs_order_event, store: store, discogs_order_id: "order-123")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:discogs_order_id]).to include("has already been taken")
    end

    it "allows the same discogs_order_id for different stores" do
      store1 = create(:store)
      store2 = create(:store)
      create(:discogs_order_event, store: store1, discogs_order_id: "order-456")

      event2 = build(:discogs_order_event, store: store2, discogs_order_id: "order-456")
      expect(event2).to be_valid
    end
  end

  describe "associations" do
    it "belongs to a store" do
      event = create(:discogs_order_event)
      expect(event.store).to be_a(Store)
    end
  end

  describe "defaults" do
    it "defaults listing_ids to an empty array" do
      event = create(:discogs_order_event, listing_ids: [])
      expect(event.listing_ids).to eq([])
    end

    it "defaults removed_listing_count to 0" do
      event = create(:discogs_order_event, removed_listing_count: 0)
      expect(event.removed_listing_count).to eq(0)
    end
  end
end
