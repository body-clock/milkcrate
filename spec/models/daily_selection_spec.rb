require "rails_helper"

RSpec.describe DailySelection, type: :model do
  let(:store) { create(:store) }

  describe "validations" do
    it "requires selected_on" do
      ds = DailySelection.new(store: store, listing_ids: [])
      ds.selected_on = nil
      expect(ds).not_to be_valid
    end

    it "enforces uniqueness of selected_on scoped to store" do
      create(:daily_selection, store: store, selected_on: Date.today, listing_ids: [])
      duplicate = DailySelection.new(store: store, selected_on: Date.today, listing_ids: [])
      expect(duplicate).not_to be_valid
    end
  end

  describe ".on" do
    it "returns the selection for the given store and date" do
      ds = create(:daily_selection, store: store, selected_on: Date.today, listing_ids: [])
      expect(DailySelection.on(store, Date.today)).to eq(ds)
    end

    it "returns nil when no selection exists for that date" do
      expect(DailySelection.on(store, Date.today)).to be_nil
    end
  end

  describe "#listings" do
    it "returns listings matching listing_ids" do
      listing = create(:listing, store: store)
      other   = create(:listing, store: store)
      ds = create(:daily_selection, store: store, selected_on: Date.today, listing_ids: [ listing.id ])

      expect(ds.listings).to include(listing)
      expect(ds.listings).not_to include(other)
    end
  end
end
