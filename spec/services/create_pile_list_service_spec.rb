require "rails_helper"

RSpec.describe CreatePileListService do
  subject(:service) do
    described_class.new(shopper:, store_slug:, item_ids:)
  end

  let(:shopper) { create(:discogs_shopper) }
  let(:store_slug) { "test-store" }

  describe "#call" do
    context "when the pile is empty" do
      let(:item_ids) { [] }

      it "returns an error" do
        result = service.call
        expect(result).not_to be_success
        expect(result.error).to eq("No items in pile.")
      end
    end

    context "when shopper is not authenticated" do
      let(:item_ids) { %w[listing-1] }
      let(:shopper) { create(:discogs_shopper, oauth_token: nil, oauth_token_secret: nil) }

      it "returns an error" do
        result = service.call
        expect(result).not_to be_success
        expect(result.error).to eq("Shopper not authenticated with Discogs.")
      end
    end

    context "when none of the items have release data" do
      let(:item_ids) { %w[listing-no-release] }

      before do
        create(:listing, discogs_listing_id: "listing-no-release", discogs_release_id: nil)
      end

      it "returns an error" do
        result = service.call
        expect(result).not_to be_success
        expect(result.error).to eq("No items could be added to the list — none have release data.")
      end
    end

    context "when items have release data" do
      let(:item_ids) { %w[listing-1 listing-2 listing-3] }

      let!(:listing1) { create(:listing, discogs_listing_id: "listing-1", discogs_release_id: "100") }
      let!(:listing2) { create(:listing, discogs_listing_id: "listing-2", discogs_release_id: "200") }
      let!(:listing3) { create(:listing, discogs_listing_id: "listing-3", discogs_release_id: nil) }

      let(:list_client) { instance_double(Discogs::ShopperListClient) }
      let(:list_result) { instance_double(Discogs::ShopperListClient::ListResult, list_id: 42, list_url: "https://discogs.com/lists/42") }
      let(:add_item_result) { instance_double(Discogs::ShopperListClient::AddItemResult, item_id: 1) }

      before do
        allow(Discogs::ShopperListClient).to receive(:new)
          .with(access_token: shopper.oauth_token, access_token_secret: shopper.oauth_token_secret)
          .and_return(list_client)
        allow(list_client).to receive(:create_list).and_return(list_result)
        allow(list_client).to receive(:add_item).and_return(add_item_result)
      end

      it "creates a list and adds items with valid release_ids" do
        expect(list_client).to receive(:create_list).with(
          name: "Picks from test-store",
          description: /Records I found/
        )

        expect(list_client).to receive(:add_item).with(list_id: 42, release_id: 100)
        expect(list_client).to receive(:add_item).with(list_id: 42, release_id: 200)
        expect(list_client).not_to receive(:add_item).with(list_id: 42, release_id: anything) # listing-3 has no release_id

        result = service.call

        expect(result).to be_success
        expect(result.list_url).to eq("https://discogs.com/lists/42")
        expect(result.added_count).to eq(2)
        expect(result.skipped_count).to eq(1)
      end

      it "updates last_used_at on the shopper" do
        expect { service.call }
          .to change { shopper.reload.last_used_at }
      end
    end
  end
end
