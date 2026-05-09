require "rails_helper"

RSpec.describe "Admin::Waitlists", type: :request do
  around do |example|
    ENV["ADMIN_HTTP_BASIC_USER"] = "admin"
    ENV["ADMIN_HTTP_BASIC_PASSWORD"] = "secret"
    example.run
  ensure
    ENV.delete("ADMIN_HTTP_BASIC_USER")
    ENV.delete("ADMIN_HTTP_BASIC_PASSWORD")
  end

  describe "GET /admin" do
    context "without credentials" do
      it "returns 401" do
        get "/admin"
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with wrong credentials" do
      it "returns 401" do
        get "/admin", headers: auth_headers("admin", "wrong")
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with valid credentials" do
      it "returns 200 and renders the page" do
        get "/admin", headers: auth_headers("admin", "secret")
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("Applications")
      end

      it "lists waitlist entries ordered by most recent first" do
        older = create(:waitlist, name: "Older Store", email: "older@example.com", discogs_username: "older", created_at: 1.day.ago)
        newer = create(:waitlist, name: "Newer Store", email: "newer@example.com", discogs_username: "newer", created_at: 1.hour.ago)

        get "/admin", headers: auth_headers("admin", "secret")

        expect(response.body).to include("Newer Store")
        expect(response.body).to include("Older Store")
        expect(response.body.index("Newer Store")).to be < response.body.index("Older Store")
      end

      it "shows all fields for each entry" do
        create(:waitlist,
          name: "Test Store",
          email: "test@example.com",
          discogs_username: "teststore",
          inventory_size: "500_2000",
          notes: "We love jazz."
        )

        get "/admin", headers: auth_headers("admin", "secret")

        expect(response.body).to include("Test Store")
        expect(response.body).to include("test@example.com")
        expect(response.body).to include("teststore")
        expect(response.body).to include("500_2000")
        expect(response.body).to include("We love jazz.")
      end

      it "renders an empty state when no applications exist" do
        get "/admin", headers: auth_headers("admin", "secret")
        expect(response.body).to include("No applications yet.")
      end
    end
  end

  def auth_headers(username, password)
    credentials = Base64.strict_encode64("#{username}:#{password}")
    { "HTTP_AUTHORIZATION" => "Basic #{credentials}" }
  end
end
