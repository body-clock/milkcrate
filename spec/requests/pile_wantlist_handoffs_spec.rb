require "rails_helper"

RSpec.describe "Pile Wantlist handoffs", type: :request do
  let(:store) { create(:store, discogs_username: "teststore", discogs_user_id: 4_616_786) }
  let(:shopper) { create(:discogs_shopper, discogs_username: "shopper1") }
  let!(:listing) { create(:listing, store:, discogs_listing_id: "111", discogs_release_id: 10_001) }
  let(:client) { instance_double(Discogs::ShopperWantlistClient) }

  before do
    allow(Settings.features.seller_wantlist_handoff).to receive(:enabled).and_return(true)

    allow(Discogs::ShopperWantlistClient).to receive(:new)
      .with(access_token: shopper.oauth_token, access_token_secret: shopper.oauth_token_secret)
      .and_return(client)
    allow(client).to receive(:add_want)
      .with(username: shopper.discogs_username, release_id: 10_001)
      .and_return(Discogs::ShopperWantlistClient::AddWantResult.new(item_id: 123))
  end

  def make_request(store_slug: "teststore", items: nil)
    items ||= [ { discogs_listing_id: "111" } ]
    post "/pile/add_to_wantlist", params: { store_slug:, items: }, as: :json
  end

  describe "POST /pile/add_to_wantlist" do
    context "when feature is enabled" do
      context "with authenticated shopper" do
        before do
          allow_any_instance_of(PileController).to receive(:session).and_return(
            ActiveSupport::HashWithIndifferentAccess.new(shopper_id: shopper.id)
          )
        end

        it "returns a successful handoff result" do
          post "/pile/add_to_wantlist", params: { store_slug: "teststore", items: [{ discogs_listing_id: "111" }] }, as: :json

          expect(response).to have_http_status(:ok)
          body = response.parsed_body
          expect(body["wantlist_url"]).to eq("https://www.discogs.com/shop/mywants/?seller=4616786")
          expect(body["added"]).to eq(1)
          expect(body["skipped"]).to eq(0)
        end

        it "rejects requests without store_slug" do
          post "/pile/add_to_wantlist", params: {
            items: [ { discogs_listing_id: "111" } ]
          }, as: :json

          expect(response).to have_http_status(:unprocessable_content)
          expect(response.parsed_body["error"]).to match(/Store context is required/)
        end

        it "rejects requests for unknown stores" do
          make_request(store_slug: "nonexistent")

          expect(response).to have_http_status(:not_found)
          expect(response.parsed_body["error"]).to match(/Store not found/)
        end

        it "does not expose OAuth credentials in the response" do
          make_request

          body = response.parsed_body
          expect(body.keys).not_to include("oauth_token", "oauth_token_secret")
        end
      end

      context "without authenticated shopper" do
        it "returns unauthorized" do
          make_request

          expect(response).to have_http_status(:unauthorized)
          expect(response.parsed_body["error"]).to match(/Not authenticated/)
        end

        it "does not attempt any Wantlist writes" do
          expect(Discogs::ShopperWantlistClient).not_to receive(:new)

          make_request
        end
      end
    end

    context "when feature is disabled" do
      before do
        allow(Settings.features.seller_wantlist_handoff).to receive(:enabled).and_return(false)
        allow_any_instance_of(PileController).to receive(:session).and_return(
          ActiveSupport::HashWithIndifferentAccess.new(shopper_id: shopper.id)
        )
      end

      it "returns forbidden even for authenticated shoppers" do
        make_request

        expect(response).to have_http_status(:forbidden)
        expect(response.parsed_body["error"]).to match(/not yet available/)
      end

      it "does not attempt any Wantlist writes" do
        expect(Discogs::ShopperWantlistClient).not_to receive(:new)

        make_request
      end
    end
  end
end
