require "rails_helper"

RSpec.describe "Waitlists", type: :request do
  describe "POST /waitlist" do
    let(:valid_params) do
      {
        waitlist: {
          name: "Dusty Grooves",
          email: "hi@dustygrooves.com",
          discogs_username: "dustygrooves",
          inventory_size: "2000_10000",
          notes: "We specialize in jazz and soul."
        }
      }
    end

    context "with valid params" do
      it "creates a waitlist entry" do
        expect {
          post "/waitlist", params: valid_params
        }.to change(Waitlist, :count).by(1)
      end

      it "renders the apply page with submitted: true" do
        post "/waitlist", params: valid_params
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("submitted")
      end
    end

    context "with missing name" do
      it "does not create an entry" do
        params = valid_params.deep_merge(waitlist: { name: "" })
        expect {
          post "/waitlist", params: params
        }.not_to change(Waitlist, :count)
      end

      it "renders the apply page with submitted: false" do
        params = valid_params.deep_merge(waitlist: { name: "" })
        post "/waitlist", params: params
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("submitted")
      end
    end

    context "with invalid email" do
      it "does not create an entry" do
        params = valid_params.deep_merge(waitlist: { email: "notvalid" })
        expect {
          post "/waitlist", params: params
        }.not_to change(Waitlist, :count)
      end
    end

    context "with missing discogs_username" do
      it "does not create an entry" do
        params = valid_params.deep_merge(waitlist: { discogs_username: "" })
        expect {
          post "/waitlist", params: params
        }.not_to change(Waitlist, :count)
      end
    end
  end
end
