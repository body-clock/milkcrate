require "rails_helper"

RSpec.describe StoreOwner do
  describe "validations" do
    it "requires a discogs_username" do
      owner = build(:store_owner, discogs_username: nil)
      expect(owner).not_to be_valid
    end

    it "requires a unique discogs_username" do
      create(:store_owner, discogs_username: "testuser")
      owner = build(:store_owner, discogs_username: "testuser")
      expect(owner).not_to be_valid
    end
  end

  describe "#oauth_authorized?" do
    it "returns true when all OAuth fields are present" do
      owner = build(:store_owner)
      expect(owner).to be_oauth_authorized
    end

    it "returns false when token is missing" do
      owner = build(:store_owner, discogs_oauth_token: nil)
      expect(owner).not_to be_oauth_authorized
    end

    it "returns false when authorized_at is missing" do
      owner = build(:store_owner, oauth_authorized_at: nil)
      expect(owner).not_to be_oauth_authorized
    end
  end
end
