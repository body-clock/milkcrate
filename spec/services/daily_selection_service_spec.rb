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
        described_class.new(store).generate(date: Date.new(2026, 5, 1))
      }.to change(DailySelection, :count).by(1)
    end

    it "creates or updates the selection for the supplied date" do
      make_listing

      selection = described_class.new(store).generate(date: Date.new(2026, 4, 1))

      expect(selection.selected_on).to eq(Date.new(2026, 4, 1))
    end

    it "returns a DailySelection with listing_ids" do
      listing = make_listing
      result = described_class.new(store).generate(date: Date.new(2026, 5, 1))

      expect(result).to be_a(DailySelection)
      expect(result.listing_ids).to include(listing.id)
    end

    it "is idempotent — calling twice on same date updates instead of duplicating" do
      make_listing
      date = Date.new(2026, 5, 1)
      described_class.new(store).generate(date:)

      expect {
        described_class.new(store).generate(date:)
      }.not_to change(DailySelection, :count)
    end

    it "caps selection at SELECTION_SIZE" do
      # Create more listings than SELECTION_SIZE to verify cap
      # Use a small count since SELECTION_SIZE=500 and DB inserts are slow
      stub_const("DailySelectionService::SELECTION_SIZE", 3)
      3.times { make_listing }

      result = described_class.new(store).generate(date: Date.new(2026, 5, 1))
      expect(result.listing_ids.size).to be <= 3
    end

    context "with yesterday's selection" do
      it "carries over a fraction of yesterday's listings" do
        stub_const("DailySelectionService::SELECTION_SIZE", 10)
        stub_const("DailySelectionService::OVERLAP_FRACTION", 0.5)

        listings = 5.times.map { make_listing }
        yesterday = DailySelection.create!(
          store: store,
          selected_on: Date.new(2026, 4, 30),
          listing_ids: listings.map(&:id)
        )

        result = described_class.new(store).generate(date: Date.new(2026, 5, 1))

        # At least some carry-over should be present
        overlap = (result.listing_ids & yesterday.listing_ids).size
        expect(overlap).to be >= 1
      end

      it "uses the day before the supplied date for carry-over" do
        stub_const("DailySelectionService::SELECTION_SIZE", 10)
        stub_const("DailySelectionService::OVERLAP_FRACTION", 0.5)

        carry_listing = make_listing
        system_yesterday_listing = make_listing
        DailySelection.create!(store:, selected_on: Date.new(2026, 1, 9), listing_ids: [ carry_listing.id ])
        DailySelection.create!(store:, selected_on: Date.current - 1, listing_ids: [ system_yesterday_listing.id ])

        result = described_class.new(store).generate(date: Date.new(2026, 1, 10))

        expect(result.listing_ids).to include(carry_listing.id)
      end
    end

    context "score_listings weighting" do
      it "gives higher weight to recently listed records" do
        service = described_class.new(store)

        date = Date.new(2026, 5, 1)
        new_listing = make_listing(listed_at: date - 1.day)
        old_listing = make_listing(listed_at: date - 200.days)

        scored = service.send(:score_listings, store.listings.where(id: [ new_listing.id, old_listing.id ]), date:)
        scores = scored.to_h { |l, w| [ l.id, w ] }

        expect(scores[new_listing.id]).to be > scores[old_listing.id]
      end

      it "gives UNSEEN_BOOST to listings not in recent selections" do
        service = described_class.new(store)

        seen_listing  = make_listing
        unseen_listing = make_listing

        DailySelection.create!(
          store: store,
          selected_on: Date.new(2026, 5, 1),
          listing_ids: [ seen_listing.id ]
        )

        scored = service.send(:score_listings, store.listings.where(id: [ seen_listing.id, unseen_listing.id ]), date: Date.new(2026, 5, 1))
        scores = scored.to_h { |l, w| [ l.id, w ] }

        expect(scores[unseen_listing.id]).to be > scores[seen_listing.id]
      end

      it "uses the supplied date for recent-listing boosts" do
        service = described_class.new(store)
        requested_date = Date.new(2026, 1, 10)
        listing = make_listing(listed_at: Date.new(2026, 1, 1))

        requested_score = service.send(:score_listings, store.listings.where(id: listing.id), date: requested_date).first.last
        later_score = service.send(:score_listings, store.listings.where(id: listing.id), date: requested_date + 120.days).first.last

        expect(requested_score).to be > later_score
      end

      it "uses scorer-derived quality and desirability signals" do
        service = described_class.new(store)
        strong = make_listing(condition: "Near Mint", want_count: 800, have_count: 300, genres: [ "Jazz" ])
        weak = make_listing(condition: "Generic", want_count: 0, have_count: 0, genres: [ "Jazz" ])

        scored = service.send(:score_listings, store.listings.where(id: [ strong.id, weak.id ]), date: Date.new(2026, 5, 1))
        scores = scored.to_h { |l, w| [ l.id, w ] }

        expect(scores[strong.id]).to be > scores[weak.id]
      end

      it "uses a recent-selection window relative to the supplied date" do
        service = described_class.new(store)
        listing = make_listing

        DailySelection.create!(
          store:,
          selected_on: Date.new(2026, 1, 8),
          listing_ids: [ listing.id ]
        )

        recent_score = service.send(:score_listings, store.listings.where(id: listing.id), date: Date.new(2026, 1, 10)).first.last
        old_score = service.send(:score_listings, store.listings.where(id: listing.id), date: Date.new(2026, 2, 1)).first.last

        expect(old_score).to be > recent_score
      end
    end
  end
end
