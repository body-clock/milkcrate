require "rails_helper"

RSpec.describe DailyCurationJob do
  let(:store) { create(:store) }

  def make_lp_listing(overrides = {})
    create(:listing, {
      store: store,
      format: "LP",
      genres: [ "Jazz" ],
      last_seen_at: Time.current
    }.merge(overrides))
  end

  describe "#perform" do
    context "with a specific store_id" do
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

        described_class.new.perform(store.id)

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
          described_class.new.perform(store.id)
        }.to change { listing.reload.surface_count }.by(1)
      end
    end

    context "without a store_id" do
      it "updates surfaced bookkeeping for curated listings across all stores" do
        store1_listing = make_lp_listing
        store2 = create(:store)
        store2_listing = create(:listing, store: store2, format: "LP", genres: [ "Soul" ], last_seen_at: Time.current)

        store1_curation = instance_double(
          StorefrontCuration,
          crates: [ CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: [ store1_listing ]) ],
          surfaced_listings: [ store1_listing ]
        )
        store2_curation = instance_double(
          StorefrontCuration,
          crates: [ CuratedCrate.new(slug: "picks", name: "Milkcrate Picks", listings: []) ],
          surfaced_listings: [ store2_listing ]
        )
        allow(StorefrontCuration).to receive(:new).with(store).and_return(store1_curation)
        allow(StorefrontCuration).to receive(:new).with(store2).and_return(store2_curation)

        described_class.new.perform

        aggregate_failures do
          expect(store1_listing.reload.surface_count).to eq(1)
          expect(store1_listing.last_surfaced_at).to be_present
          expect(store2_listing.reload.surface_count).to eq(1)
          expect(store2_listing.last_surfaced_at).to be_present
        end
      end
    end
  end
end
