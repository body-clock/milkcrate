require "rails_helper"

RSpec.describe Admin::DiscogsSignupAvailability do
  let(:username) { "new-user" }

  def fake_lookup(result)
    instance_double(DiscogsSellerLookup, call: result)
  end

  describe "#call" do
    it "returns creatable when username is not in store or waitlist" do
      lookup = fake_lookup(found: true, seller_name: "New User", avatar_url: "https://example.com/avatar.jpg")
      result = described_class.new(username, lookup:).call

      expect(result.status).to eq("creatable")
      expect(result.data[:creatable]).to be(true)
      expect(result.data[:seller_name]).to eq("New User")
    end

    it "returns already_active when store exists" do
      store = create(:store, discogs_username: username.downcase)
      lookup = fake_lookup(found: true, seller_name: "New User", avatar_url: nil)
      result = described_class.new(username, lookup:).call

      expect(result.status).to eq("already_active")
      expect(result.data[:store][:id]).to eq(store.id)
    end

    it "returns existing_applicant when waitlist applicant exists" do
      create(:waitlist, discogs_username: username.downcase)
      lookup = fake_lookup(found: true, seller_name: "New User", avatar_url: nil)
      result = described_class.new(username, lookup:).call

      expect(result.status).to eq("existing_applicant")
      expect(result.data[:applicant][:discogs_username]).to eq(username.downcase)
    end

    it "returns invalid for invalid slug" do
      lookup = fake_lookup(found: false, reason: "invalid_slug")
      result = described_class.new(username, lookup:).call

      expect(result.status).to eq("invalid")
      expect(result.data[:creatable]).to be(false)
    end

    it "returns lookup_error for Discogs API errors" do
      lookup = fake_lookup(found: false, reason: "api_error")
      result = described_class.new(username, lookup:).call

      expect(result.status).to eq("lookup_error")
      expect(result.data[:creatable]).to be(false)
    end
  end
end
