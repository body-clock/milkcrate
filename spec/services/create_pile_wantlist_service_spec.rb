require "rails_helper"

RSpec.describe CreatePileWantlistService do
  subject(:service) do
    described_class.new(shopper:, item_ids:, store:)
  end

  let(:store) { create(:store, discogs_username: "teststore", discogs_user_id: 4_616_786) }
  let(:shopper) { create(:discogs_shopper, discogs_username: "shopper1") }
  let(:item_ids) { [] }
  let(:client) { instance_double(Discogs::ShopperWantlistClient) }

  before do
    allow(Discogs::ShopperWantlistClient).to receive(:new)
      .with(access_token: shopper.oauth_token, access_token_secret: shopper.oauth_token_secret)
      .and_return(client)
  end

  describe ".call" do
    context "with an empty pile" do
      let(:item_ids) { [] }

      it "returns an error" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to match(/No items in pile/)
      end
    end

    context "with unauthenticated shopper" do
      let(:shopper) { create(:discogs_shopper, oauth_token: nil, oauth_token_secret: nil) }
      let(:item_ids) { %w[111 222] }

      it "returns an error" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to match(/not authenticated/)
      end
    end

    context "with valid items from the store" do
      let!(:listing_a) do
        create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001)
      end
      let!(:listing_b) do
        create(:listing, store:, discogs_listing_id: "222", discogs_release_id: 10_002)
      end
      let(:item_ids) { %w[111 222] }

      before do
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 123))
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_002)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 456))
      end

      it "adds both releases to the shopper's Wantlist" do
        expect(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
        expect(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_002)

        service.call
      end

      it "returns a successful result with correct counts" do
        result = service.call

        expect(result).to be_success
        expect(result.added_count).to eq(2)
        expect(result.skipped_count).to eq(0)
      end

      it "returns a seller-scoped Shop My Wants URL" do
        result = service.call

        expect(result.wantlist_url).to eq("https://www.discogs.com/shop/mywants/?seller=4616786")
      end
    end

    context "with items not belonging to the store" do
      let(:other_store) { create(:store, discogs_username: "other") }
      let!(:other_listing) do
        create(:listing, store: other_store, discogs_listing_id: "999", discogs_release_id: 99_999)
      end
      let(:item_ids) { %w[999] }

      it "returns an error because none of the items belong to the store" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to match(/No items could be added/)
      end

      it "does not attempt any Wantlist writes" do
        expect(client).not_to receive(:add_want)

        service.call
      end
    end

    context "with duplicate release IDs from multiple listings" do
      let!(:listing_a) do
        create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001)
      end
      let!(:listing_b) do
        create(:listing, store:, discogs_listing_id: "222", discogs_release_id: 10_001)
      end
      let(:item_ids) { %w[111 222] }

      before do
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 123))
      end

      it "produces only one Wantlist write for the duplicate release" do
        expect(client).to receive(:add_want).once

        service.call
      end

      it "reports the accurate counts" do
        result = service.call

        expect(result.added_count).to eq(1)
        expect(result.skipped_count).to eq(1)
      end
    end

    context "when store has no Discogs profile ID" do
      let(:store) { create(:store, discogs_username: "noid", discogs_user_id: nil) }
      let!(:listing) do
        create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001)
      end
      let(:item_ids) { %w[111] }

      before do
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 123))
      end

      it "succeeds but returns no handoff URL" do
        result = service.call

        expect(result).to be_success
        expect(result.added_count).to eq(1)
        expect(result.wantlist_url).to be_nil
      end
    end

    context "when the pile exceeds the operation limit" do
      let(:item_ids) { (1..51).map(&:to_s) }

      before do
        allow(store.listings).to receive(:where).and_call_original
        # Stub the listing resolution to return 51 unique releases
        listings = item_ids.map.with_index { |id, i| [ id, 20_000 + i ] }
        relation = double("Relation")
        allow(store.listings).to receive(:where).with(discogs_listing_id: item_ids).and_return(relation)
        allow(relation).to receive(:pluck).with(:discogs_listing_id, :discogs_release_id).and_return(listings)
      end

      it "returns an error" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to match(/Too many unique releases/)
      end

      it "does not attempt any Wantlist writes" do
        expect(client).not_to receive(:add_want)

        service.call
      end
    end

    context "with partial Discogs write failures" do
      let!(:listing_a) do
        create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001)
      end
      let!(:listing_b) do
        create(:listing, store:, discogs_listing_id: "222", discogs_release_id: 10_002)
      end
      let!(:listing_c) do
        create(:listing, store:, discogs_listing_id: "333", discogs_release_id: 10_003)
      end
      let(:item_ids) { %w[111 222 333] }

      before do
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 123))
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_002)
          .and_raise(Discogs::Errors::ApiError, "already in wantlist")
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_003)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 789))
      end

      it "reports partial success accurately" do
        result = service.call

        expect(result).to be_success
        expect(result.added_count).to eq(2)
        expect(result.skipped_count).to eq(1)
      end

      it "still provides the handoff URL when some adds succeeded" do
        result = service.call

        expect(result.wantlist_url).to be_present
      end
    end

    context "with total Discogs write failures" do
      let!(:listing) do
        create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001)
      end
      let(:item_ids) { %w[111] }

      before do
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
          .and_raise(Discogs::Errors::ApiError, "not found")
      end

      it "returns an error when no adds succeeded" do
        result = service.call

        expect(result).not_to be_success
        expect(result.error).to match(/Could not add any releases/)
      end

      it "does not provide a handoff URL" do
        result = service.call

        expect(result.wantlist_url).to be_nil
      end
    end

    context "with rate limiting mid-batch" do
      let!(:listing_a) do
        create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001)
      end
      let!(:listing_b) do
        create(:listing, store:, discogs_listing_id: "222", discogs_release_id: 10_002)
      end
      let(:item_ids) { %w[111 222] }

      before do
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_001)
          .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 123))
        allow(client).to receive(:add_want)
          .with(username: shopper.discogs_username, release_id: 10_002)
          .and_raise(Discogs::Errors::RateLimitError, "rate limit hit")
      end

      it "stops processing on rate limit" do
        result = service.call

        expect(result).to be_success
        expect(result.added_count).to eq(1)
        expect(result.skipped_count).to eq(1)
      end

      it "processes releases in pile order when records resolve in another order" do
        relation = instance_double(ActiveRecord::Relation)
        allow(store.listings).to receive(:where).with(discogs_listing_id: item_ids).and_return(relation)
        allow(relation).to receive(:pluck).with(:discogs_listing_id, :discogs_release_id)
          .and_return([ [ "222", 10_002 ], [ "111", 10_001 ] ])

        result = service.call

        expect(result).to be_success
        expect(result.added_count).to eq(1)
        expect(result.skipped_count).to eq(1)
      end
    end
  end
end
