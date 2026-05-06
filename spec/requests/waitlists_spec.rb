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

      it "redirects to the apply page" do
        post "/waitlist", params: valid_params
        expect(response).to have_http_status(:found)
        expect(response).to redirect_to(apply_path)
      end

      it "renders the apply page with submitted: true after redirect" do
        post "/waitlist", params: valid_params
        follow_redirect!
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("submitted")
      end

      it "is refresh-safe: redirect prevents form resubmission on refresh" do
        post "/waitlist", params: valid_params
        expect(response).to have_http_status(:found)
      end
    end

    context "when Turnstile is enabled" do
      before do
        allow(TurnstileVerifier).to receive(:enabled?).and_return(true)
      end

      it "does not create an entry without a Turnstile token" do
        expect {
          post "/waitlist", params: valid_params
        }.not_to change(Waitlist, :count)
      end

      it "renders the apply page with submitted: false without a Turnstile token" do
        post "/waitlist", params: valid_params

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("submitted")
        expect(response.body).to include("turnstile")
      end

      it "does not create an entry when Turnstile verification fails" do
        allow(TurnstileVerifier).to receive(:verify).with(
          token: "bad-token",
          remote_ip: "127.0.0.1"
        ).and_return(false)

        expect {
          post "/waitlist", params: valid_params.merge(turnstile_token: "bad-token")
        }.not_to change(Waitlist, :count)
      end

      it "creates an entry when Turnstile verification succeeds" do
        allow(TurnstileVerifier).to receive(:verify).with(
          token: "good-token",
          remote_ip: "127.0.0.1"
        ).and_return(true)

        expect {
          post "/waitlist", params: valid_params.merge(turnstile_token: "good-token")
        }.to change(Waitlist, :count).by(1)
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

    context "DB-backed constraints" do
      it "raises on duplicate discogs_username" do
        Waitlist.create!(name: "First", email: "a@b.com", discogs_username: "dup")
        second = Waitlist.new(name: "Second", email: "c@d.com", discogs_username: "dup")
        expect { second.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
      end

      it "rejects null name at database level" do
        entry = Waitlist.new(name: nil, email: "a@b.com", discogs_username: "user")
        expect { entry.save(validate: false) }.to raise_error(ActiveRecord::NotNullViolation)
      end

      it "rejects null email at database level" do
        entry = Waitlist.new(name: "Store", email: nil, discogs_username: "user")
        expect { entry.save(validate: false) }.to raise_error(ActiveRecord::NotNullViolation)
      end

      it "rejects null discogs_username at database level" do
        entry = Waitlist.new(name: "Store", email: "a@b.com", discogs_username: nil)
        expect { entry.save(validate: false) }.to raise_error(ActiveRecord::NotNullViolation)
      end
    end
  end
end
