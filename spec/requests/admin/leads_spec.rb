require "rails_helper"

RSpec.describe "Admin::Leads", type: :request do
  around do |example|
    ENV["ADMIN_HTTP_BASIC_USER"] = "admin"
    ENV["ADMIN_HTTP_BASIC_PASSWORD"] = "secret"
    example.run
  ensure
    ENV.delete("ADMIN_HTTP_BASIC_USER")
    ENV.delete("ADMIN_HTTP_BASIC_PASSWORD")
  end

  def auth_headers
    credentials = Base64.strict_encode64("admin:secret")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end

  let!(:lead) { create(:lead, status: :pending) }

  describe "GET /admin/leads" do
    it "returns the leads index" do
      get admin_leads_path, headers: auth_headers
      expect(response).to have_http_status(:ok)
    end

    it "filters by status" do
      create(:lead, status: :dismissed)
      get admin_leads_path, params: { status: "pending" }, headers: auth_headers
      expect(response).to have_http_status(:ok)
    end

    it "filters by min_score" do
      get admin_leads_path, params: { min_score: 70 }, headers: auth_headers
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /admin/leads/:id" do
    it "returns the lead detail page" do
      get admin_lead_path(lead), headers: auth_headers
      expect(response).to have_http_status(:ok)
    end

    it "returns 404 for missing leads" do
      get admin_lead_path(id: 999999), headers: auth_headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /admin/leads/:id" do
    it "updates lead status" do
      patch admin_lead_path(lead), params: { lead: { status: "reviewed" } }, headers: auth_headers
      expect(response).to redirect_to(admin_leads_path)
      expect(lead.reload).to be_reviewed
    end

    it "updates lead notes" do
      patch admin_lead_path(lead), params: { lead: { notes: "Interesting seller" } }, headers: auth_headers
      expect(response).to redirect_to(admin_leads_path)
      expect(lead.reload.notes).to eq("Interesting seller")
    end

    it "sets reviewed_at when status changes" do
      expect {
        patch admin_lead_path(lead), params: { lead: { status: "contacted" } }, headers: auth_headers
      }.to change { lead.reload.reviewed_at }.from(nil)
    end
  end

  describe "POST /admin/leads/:id/onboard" do
    context "when lead is not yet onboarded" do
      before do
        client = instance_double(DiscogsClient)
        allow(DiscogsClient).to receive(:new).and_return(client)
        allow(client).to receive(:seller_profile).and_return({ "name" => "Record Store" })
      end

      it "creates a store and marks lead as onboarded" do
        expect {
          post onboard_admin_lead_path(lead), headers: auth_headers
        }.to change(Store, :count).by(1)

        expect(lead.reload).to be_onboarded
        expect(lead.reviewed_at).to be_present
        expect(response).to redirect_to(admin_leads_path)
      end
    end

    context "when lead is already onboarded" do
      it "returns an error" do
        lead.update!(status: :onboarded)
        post onboard_admin_lead_path(lead), headers: auth_headers
        expect(response).to redirect_to(admin_leads_path)
      end
    end

    context "when StoreOnboarding fails" do
      before do
        allow(StoreOnboarding).to receive(:call).and_raise(StoreOnboarding::Error, "Discogs username is required")
      end

      it "redirects with an alert" do
        post onboard_admin_lead_path(lead), headers: auth_headers
        expect(response).to redirect_to(admin_leads_path)
      end
    end
  end
end
