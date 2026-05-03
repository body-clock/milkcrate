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
      it "updates last_surfaced_at for surfaced listings" do
        listing = make_lp_listing

        # Stub PicksSelector so we don't need scoring machinery
        selector = instance_double(PicksSelector)
        allow(PicksSelector).to receive(:new).with(store).and_return(selector)
        allow(selector).to receive(:select_picks).and_return([ listing ])
        allow(selector).to receive(:rank_genre).and_return([])

        expect {
          described_class.new.perform(store.id)
        }.to change { listing.reload.last_surfaced_at }.from(nil)
      end

      it "increments surface_count for surfaced listings" do
        listing = make_lp_listing

        selector = instance_double(PicksSelector)
        allow(PicksSelector).to receive(:new).with(store).and_return(selector)
        allow(selector).to receive(:select_picks).and_return([ listing ])
        allow(selector).to receive(:rank_genre).and_return([])

        expect {
          described_class.new.perform(store.id)
        }.to change { listing.reload.surface_count }.by(1)
      end
    end

    context "without a store_id" do
      it "processes all stores" do
        # Force store to exist before store2 so Store.all order is deterministic
        store
        store2 = create(:store)
        selector = instance_double(PicksSelector, select_picks: [], rank_genre: [])
        allow(PicksSelector).to receive(:new).and_return(selector)

        described_class.new.perform

        expect(PicksSelector).to have_received(:new).with(store)
        expect(PicksSelector).to have_received(:new).with(store2)
      end
    end
  end
end
