require "rails_helper"

RSpec.describe StoreSync::InventoryUpdater do
  let(:store) { create(:store) }

  def record_attrs(overrides = {})
    {
      discogs_listing_id: "listing-#{SecureRandom.hex(4)}",
      artist: "Artist",
      title: "Title",
      label: "Label",
      year: 1975,
      format: "Vinyl",
      condition: "VG+",
      price: 12.50,
      currency: "USD",
      listed_at: Time.current,
      last_seen_at: Time.current
    }.merge(overrides)
  end

  describe "#call" do
    it "creates new listings from Discogs records" do
      importer = described_class.new(store)
      records = [ record_attrs, record_attrs ]

      expect {
        importer.call(records)
      }.to change(store.listings, :count).by(2)
    end

    it "returns listing IDs for enrichment when a listing is new" do
      importer = described_class.new(store)
      records = [ record_attrs(discogs_listing_id: "new-1") ]

      ids = importer.call(records)

      expect(ids).not_to be_empty
    end

    it "returns listing IDs for enrichment when a listing has materially changed" do
      create(:listing, store:, discogs_listing_id: "existing-1", condition: "VG", notes: nil)
      importer = described_class.new(store)
      records = [ record_attrs(discogs_listing_id: "existing-1", condition: "NM", price: 20.00) ]

      ids = importer.call(records)

      expect(ids).not_to be_empty
    end

    it "does NOT return listing IDs for unchanged listings" do
      listing = create(:listing, store:, discogs_listing_id: "existing-1",
                       condition: "VG+", notes: nil, discogs_release_id: "release-1",
                       price: 12.50)
      importer = described_class.new(store)
      records = [
        record_attrs(discogs_listing_id: "existing-1", condition: "VG+",
                     notes: nil, discogs_release_id: "release-1", price: 12.50)
      ]

      ids = importer.call(records)

      expect(ids).to be_empty
    end

    it "returns an empty array when listings is empty" do
      importer = described_class.new(store)

      ids = importer.call([])

      expect(ids).to eq([])
    end

    it "updates existing listings' fields" do
      create(:listing, store:, discogs_listing_id: "existing-1", price: 10.00, condition: "VG")
      importer = described_class.new(store)
      records = [ record_attrs(discogs_listing_id: "existing-1", price: 15.00, condition: "NM") ]

      importer.call(records)
      updated = store.listings.find_by(discogs_listing_id: "existing-1")

      expect(updated.price).to eq(15.00)
      expect(updated.condition).to eq("NM")
    end
  end

  describe "#remove_stale" do
    it "deletes listings not present in the current sync" do
      create(:listing, store:, discogs_listing_id: "keep-me")
      stale = create(:listing, store:, discogs_listing_id: "stale")
      importer = described_class.new(store)
      current_records = [ record_attrs(discogs_listing_id: "keep-me") ]

      expect {
        importer.remove_stale(current_records)
      }.to change { store.listings.exists?(stale.id) }.from(true).to(false)
    end

    it "keeps listings that are present in the current sync" do
      active = create(:listing, store:, discogs_listing_id: "keep-me")
      importer = described_class.new(store)
      current_records = [ record_attrs(discogs_listing_id: "keep-me") ]

      importer.remove_stale(current_records)

      expect(store.listings.exists?(active.id)).to be true
    end

    it "deletes all listings when current listings is empty" do
      create_list(:listing, 3, store:)
      importer = described_class.new(store)

      expect {
        importer.remove_stale([])
      }.to change(store.listings, :count).from(3).to(0)
    end
  end
end
