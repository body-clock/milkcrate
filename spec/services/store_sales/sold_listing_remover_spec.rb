# frozen_string_literal: true

require "rails_helper"

RSpec.describe StoreSales::SoldListingRemover do
  let(:store) { create(:store, total_listings: 5) }
  let(:other_store) { create(:store, total_listings: 3) }
  let(:remover) { described_class.new(store) }

  describe "#call" do
    context "with matching listings" do
      before do
        create(:listing, store: store, discogs_listing_id: "sold-111")
        create(:listing, store: store, discogs_listing_id: "sold-222")
        create(:listing, store: store, discogs_listing_id: "keep-333")
        create(:listing, store: store, discogs_listing_id: "keep-444")
        create(:listing, store: store, discogs_listing_id: "keep-555")
      end

      it "removes listings matching the given IDs" do
        result = remover.call([ "sold-111", "sold-222" ])

        expect(store.listings.where(discogs_listing_id: [ "sold-111", "sold-222" ])).to be_empty
        expect(store.listings.count).to eq(3)
      end

      it "returns correct removed_count" do
        result = remover.call([ "sold-111", "sold-222" ])

        expect(result[:removed_count]).to eq(2)
      end

      it "returns correct removed_listing_ids" do
        result = remover.call([ "sold-111", "sold-222" ])

        expect(result[:removed_listing_ids]).to match_array([ "sold-111", "sold-222" ])
      end

      it "increments inventory_version when listings are removed" do
        original_version = store.inventory_version

        remover.call([ "sold-111" ])

        expect(store.reload.inventory_version).to eq(original_version + 1)
      end

      it "updates total_listings to reflect new count" do
        remover.call([ "sold-111", "sold-222" ])

        expect(store.reload.total_listings).to eq(3)
      end

      it "only removes listings from the target store" do
        create(:listing, store: other_store, discogs_listing_id: "other-sold-111")
        create(:listing, store: other_store, discogs_listing_id: "other-keep")

        remover.call([ "other-sold-111" ])

        expect(other_store.listings.where(discogs_listing_id: "other-sold-111")).to exist
        expect(other_store.listings.count).to eq(2)
      end
    end

    context "with no matching listings" do
      before do
        create(:listing, store: store, discogs_listing_id: "keep-111")
        create(:listing, store: store, discogs_listing_id: "keep-222")
      end

      it "does not raise an error for unknown IDs" do
        expect {
          remover.call([ "unknown-999" ])
        }.not_to raise_error
      end

      it "does not increment inventory_version" do
        original_version = store.inventory_version

        remover.call([ "unknown-999" ])

        expect(store.reload.inventory_version).to eq(original_version)
      end

      it "does not update total_listings" do
        original_count = store.total_listings

        remover.call([ "unknown-999" ])

        expect(store.reload.total_listings).to eq(original_count)
      end

      it "returns zero removed_count" do
        result = remover.call([ "unknown-999" ])

        expect(result[:removed_count]).to eq(0)
      end

      it "returns empty removed_listing_ids" do
        result = remover.call([ "unknown-999" ])

        expect(result[:removed_listing_ids]).to eq([])
      end
    end

    context "with empty or nil input" do
      before do
        create(:listing, store: store, discogs_listing_id: "keep-111")
      end

      it "handles empty array input" do
        result = remover.call([])

        expect(result[:removed_count]).to eq(0)
        expect(result[:removed_listing_ids]).to eq([])
      end

      it "handles nil input" do
        result = remover.call(nil)

        expect(result[:removed_count]).to eq(0)
        expect(result[:removed_listing_ids]).to eq([])
      end

      it "handles array with nil values" do
        result = remover.call([ nil, nil ])

        expect(result[:removed_count]).to eq(0)
      end

      it "handles array with blank strings" do
        result = remover.call([ "", "" ])

        expect(result[:removed_count]).to eq(0)
      end
    end

    context "with duplicate IDs" do
      before do
        create(:listing, store: store, discogs_listing_id: "sold-111")
      end

      it "deduplicates IDs before processing" do
        result = remover.call([ "sold-111", "sold-111", "sold-111" ])

        expect(result[:removed_count]).to eq(1)
        expect(result[:removed_listing_ids]).to eq([ "sold-111" ])
      end
    end

    context "idempotency" do
      before do
        create(:listing, store: store, discogs_listing_id: "sold-111")
      end

      it "can be called multiple times safely" do
        remover.call([ "sold-111" ])
        result = remover.call([ "sold-111" ])

        expect(result[:removed_count]).to eq(0)
        expect(result[:removed_listing_ids]).to eq([])
      end

      it "only increments inventory_version once for the same listing" do
        version_after_first = nil
        version_after_second = nil

        remover.call([ "sold-111" ])
        version_after_first = store.reload.inventory_version

        remover.call([ "sold-111" ])
        version_after_second = store.reload.inventory_version

        expect(version_after_second).to eq(version_after_first)
      end
    end
  end
end
