require "rails_helper"

RSpec.describe DailyCurationService do
  let(:store) { create(:store) }

  def make_lp_listing(overrides = {})
    create(:listing, {
      store: store,
      format: "LP",
      genres: [ "Jazz" ],
      last_seen_at: Time.current
    }.merge(overrides))
  end

  describe "#curate" do
    it "updates surfaced bookkeeping for listings from storefront curation" do
      pick = make_lp_listing(genres: [ "Jazz" ])
      genre_listing = make_lp_listing(genres: [ "Rock" ])
      uncurated = make_lp_listing(genres: [ "Soul" ])

      curation = instance_double(
        StorefrontCuration,
        crates: [ CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ pick ]) ],
        surfaced_listings: [ pick, genre_listing ]
      )
      allow(StorefrontCuration).to receive(:new).with(store).and_return(curation)

      described_class.new.curate(store)

      aggregate_failures do
        expect(pick.reload.last_surfaced_at).to be_present
        expect(pick.surface_count).to eq(1)
        expect(genre_listing.reload.last_surfaced_at).to be_present
        expect(genre_listing.surface_count).to eq(1)
        expect(uncurated.reload.last_surfaced_at).to be_nil
        expect(uncurated.surface_count).to eq(0)
      end
    end

    it "increments a duplicated curated listing once per run" do
      listing = make_lp_listing(genres: [ "Jazz" ])

      curation = instance_double(
        StorefrontCuration,
        crates: [ CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ listing ]) ],
        surfaced_listings: [ listing ]
      )
      allow(StorefrontCuration).to receive(:new).with(store).and_return(curation)

      expect {
        described_class.new.curate(store)
      }.to change { listing.reload.surface_count }.by(1)
    end
  end
end
