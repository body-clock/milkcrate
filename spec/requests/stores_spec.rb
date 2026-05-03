require "rails_helper"

RSpec.describe "Stores", type: :request do
  describe "GET /:slug" do
    context "with existing store" do
      let!(:store) { create(:store, discogs_username: "teststore") }

      before do
        selector = instance_double(PicksSelector, select_picks: [], rank_genre: [])
        presenter_double = instance_double(CratePresenter,
          store_props: { id: store.id, name: store.name },
          build_crates: []
        )
        allow(PicksSelector).to receive(:new).and_return(selector)
        allow(CratePresenter).to receive(:new).and_return(presenter_double)
      end

      it "returns 200" do
        get "/teststore"
        expect(response).to have_http_status(:ok)
      end

      it "renders inertia component" do
        get "/teststore"
        expect(response.body).to include("stores/featured")
      end
    end

    context "with unknown slug" do
      it "returns 200 and renders no_stores" do
        get "/unknownstore"
        expect(response).to have_http_status(:ok)
      end
    end
  end
end
