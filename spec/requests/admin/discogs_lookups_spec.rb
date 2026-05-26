require "rails_helper"

RSpec.describe "Admin::DiscogsLookups", type: :request do
  describe "GET /admin/discogs_lookup" do
    it "redirects to login when not authenticated" do
      get "/admin/discogs_lookup", params: { username: "realseller" }

      expect(response).to redirect_to(admin_login_path)
    end

    it "returns a creatable preview for a valid seller with no existing store or applicant" do
      sign_in_admin

      allow(DiscogsSellerLookup).to receive(:new).with("RealSeller").and_return(
        lookup_result(found: true, seller_name: "Real Seller", avatar_url: "https://example.com/avatar.jpg")
      )

      get "/admin/discogs_lookup", params: { username: "RealSeller" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "status" => "creatable",
        "creatable" => true,
        "username" => "realseller",
        "seller_name" => "Real Seller",
        "avatar_url" => "https://example.com/avatar.jpg"
      )
    end

    it "delegates Discogs validation to DiscogsSellerLookup" do
      sign_in_admin

      lookup = lookup_result(found: true, seller_name: "Real Seller")
      allow(DiscogsSellerLookup).to receive(:new).with("realseller").and_return(lookup)

      get "/admin/discogs_lookup", params: { username: "realseller" }

      expect(DiscogsSellerLookup).to have_received(:new).with("realseller")
      expect(response.parsed_body["status"]).to eq("creatable")
    end

    it "returns an invalid state without checking stores or applicants" do
      sign_in_admin

      allow(DiscogsSellerLookup).to receive(:new).with("ab").and_return(lookup_result(found: false, reason: "invalid_slug"))
      allow(Store).to receive(:with_discogs_username)
      allow(Waitlist).to receive(:with_discogs_username)

      get "/admin/discogs_lookup", params: { username: "ab" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "status" => "invalid",
        "creatable" => false,
        "reason" => "invalid_slug"
      )
      expect(Store).not_to have_received(:with_discogs_username)
      expect(Waitlist).not_to have_received(:with_discogs_username)
    end

    it "returns a lookup-error state when Discogs lookup fails" do
      sign_in_admin

      allow(DiscogsSellerLookup).to receive(:new).with("broken-store").and_return(lookup_result(found: false, reason: "api_error"))

      get "/admin/discogs_lookup", params: { username: "broken-store" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "status" => "lookup_error",
        "creatable" => false,
        "reason" => "api_error"
      )
    end

    it "blocks usernames that already have an active store" do
      sign_in_admin

      store = create(:store, name: "Existing Store", discogs_username: "realseller")
      allow(DiscogsSellerLookup).to receive(:new).with("RealSeller").and_return(lookup_result(found: true, seller_name: "Real Seller"))

      get "/admin/discogs_lookup", params: { username: "RealSeller" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "status" => "already_active",
        "creatable" => false,
        "username" => "realseller"
      )
      expect(response.parsed_body["store"]).to include(
        "id" => store.id,
        "name" => "Existing Store",
        "discogs_username" => "realseller"
      )
    end

    it "blocks usernames that already have an applicant" do
      sign_in_admin

      applicant = create(:waitlist, name: "Applicant Store", discogs_username: "realseller")
      allow(DiscogsSellerLookup).to receive(:new).with("RealSeller").and_return(lookup_result(found: true, seller_name: "Real Seller"))

      get "/admin/discogs_lookup", params: { username: "RealSeller" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "status" => "existing_applicant",
        "creatable" => false,
        "username" => "realseller"
      )
      expect(response.parsed_body["applicant"]).to include(
        "id" => applicant.id,
        "name" => "Applicant Store",
        "discogs_username" => "realseller"
      )
    end
  end

  def lookup_result(result)
    instance_double(DiscogsSellerLookup, call: result)
  end
end
