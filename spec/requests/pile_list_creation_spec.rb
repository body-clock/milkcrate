require "rails_helper"

RSpec.describe "Pile list creation", type: :request do
  let(:shopper) { create(:discogs_shopper) }

  describe "POST /pile/create_list" do
    let(:store_slug) { "test-store" }
    let(:items) do
      [
        { discogs_listing_id: "listing-1" },
        { discogs_listing_id: "listing-2" }
      ]
    end

    context "when shopper is not authenticated" do
      it "returns 401" do
        post pile_create_list_path, params: { store_slug:, items: }, as: :json
        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]).to eq("Not authenticated with Discogs. Please connect your account.")
      end
    end

    context "when shopper is authenticated" do
      before do
        allow_any_instance_of(PileListsController).to receive(:session).and_return(
          ActiveSupport::HashWithIndifferentAccess.new(shopper_id: shopper.id)
        )
      end

      it "creates a list and returns success" do
        service_result = instance_double(
          CreatePileListService::Result,
          success?: true,
          list_url: "https://discogs.com/lists/42",
          added_count: 2,
          skipped_count: 0
        )

        allow(CreatePileListService).to receive_message_chain(:new, :call).and_return(service_result)

        post pile_create_list_path, params: { store_slug:, items: }, as: :json

        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json["list_url"]).to eq("https://discogs.com/lists/42")
        expect(json["added"]).to eq(2)
        expect(json["skipped"]).to eq(0)
      end
    end
  end
end
