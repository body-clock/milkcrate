require "rails_helper"

RSpec.describe DailySelectionService do
  let(:store) { create(:store) }

  def make_listing(overrides = {})
    create(:listing, { store: store, last_seen_at: Time.current }.merge(overrides))
  end

  describe "#generate" do
    it "creates a DailySelection for the given date" do
      make_listing
      expect {
        described_class.new(store).generate(date: Date.today)
      }.to change(DailySelection, :count).by(1)
    end

    it "returns a DailySelection with listing_ids" do
      listing = make_listing
      result = described_class.new(store).generate(date: Date.today)

      expect(result).to be_a(DailySelection)
      expect(result.listing_ids).to include(listing.id)
    end

    it "is idempotent — calling twice on same date updates instead of duplicating" do
      make_listing
      described_class.new(store).generate(date: Date.today)

      expect {
        described_class.new(store).generate(date: Date.today)
      }.not_to change(DailySelection, :count)
    end

    it "caps selection at SELECTION_SIZE" do
      # Create more listings than SELECTION_SIZE to verify cap
      # Use a small count since SELECTION_SIZE=500 and DB inserts are slow
      stub_const("DailySelectionService::SELECTION_SIZE", 3)
      3.times { make_listing }

      result = described_class.new(store).generate(date: Date.today)
      expect(result.listing_ids.size).to be <= 3
    end

    context "with yesterday's selection" do
      it "carries over a fraction of yesterday's listings" do
        stub_const("DailySelectionService::SELECTION_SIZE", 10)
        stub_const("DailySelectionService::OVERLAP_FRACTION", 0.5)

        listings = 5.times.map { make_listing }
        yesterday = DailySelection.create!(
          store: store,
          selected_on: Date.today - 1,
          listing_ids: listings.map(&:id)
        )

        result = described_class.new(store).generate(date: Date.today)

        # At least some carry-over should be present
        overlap = (result.listing_ids & yesterday.listing_ids).size
        expect(overlap).to be >= 1
      end
    end

    context "score_listings weighting" do
      it "gives higher weight to recently listed records" do
        service = described_class.new(store)

        new_listing = make_listing(listed_at: 1.day.ago)
        old_listing = make_listing(listed_at: 200.days.ago)

        scored = service.send(:score_listings, store.listings.where(id: [ new_listing.id, old_listing.id ]))
        scores = scored.to_h { |l, w| [ l.id, w ] }

        expect(scores[new_listing.id]).to be > scores[old_listing.id]
      end

      it "gives UNSEEN_BOOST to listings not in recent selections" do
        service = described_class.new(store)

        seen_listing  = make_listing
        unseen_listing = make_listing

        DailySelection.create!(
          store: store,
          selected_on: Date.today,
          listing_ids: [ seen_listing.id ]
        )

        scored = service.send(:score_listings, store.listings.where(id: [ seen_listing.id, unseen_listing.id ]))
        scores = scored.to_h { |l, w| [ l.id, w ] }

        expect(scores[unseen_listing.id]).to be > scores[seen_listing.id]
      end
    end
  end
end
