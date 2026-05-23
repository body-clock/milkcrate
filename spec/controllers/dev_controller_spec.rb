require "rails_helper"

RSpec.describe "DevController", type: :request do
  let(:store_owner) { create(:store_owner) }
  let!(:store) { create(:store, store_owner:) }

  describe "GET /dev/login-as/:store_id" do
    context "in development environment" do
      before do
        allow(Rails.env).to receive(:development?).and_return(true)
      end

      it "sets session[:store_owner_id] and redirects to dashboard" do
        get "/dev/login-as/#{store.id}"

        expect(response).to redirect_to(dashboard_path)
        expect(flash[:notice]).to include("Logged in as #{store.name}")
      end
    end

    context "in non-development environment" do
      before do
        allow(Rails.env).to receive(:development?).and_return(false)
      end

      it "raises RuntimeError" do
        expect {
          get "/dev/login-as/#{store.id}"
        }.to raise_error(RuntimeError, "Not available in production")
      end
    end
  end
end
