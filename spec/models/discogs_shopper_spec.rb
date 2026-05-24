require "rails_helper"

RSpec.describe DiscogsShopper do
  describe "validations" do
    it "requires a discogs_username" do
      shopper = build(:discogs_shopper, discogs_username: nil)
      expect(shopper).not_to be_valid
      expect(shopper.errors[:discogs_username]).to include("can't be blank")
    end

    it "enforces unique discogs_username case-insensitively" do
      create(:discogs_shopper, discogs_username: "test_user")
      duplicate = build(:discogs_shopper, discogs_username: "TEST_USER")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:discogs_username]).to include("has already been taken")
    end

    it "downcases username on save" do
      shopper = create(:discogs_shopper, discogs_username: "TestUser")
      expect(shopper.discogs_username).to eq("testuser")
    end
  end

  describe "token encryption" do
    it "encrypts oauth_token" do
      shopper = create(:discogs_shopper, oauth_token: "secret-token")
      expect(shopper.oauth_token).to eq("secret-token")

      raw = ActiveRecord::Base.connection.execute(
        "SELECT oauth_token FROM discogs_shoppers WHERE id = #{shopper.id}"
      ).first["oauth_token"]
      expect(raw).not_to eq("secret-token")
    end

    it "encrypts oauth_token_secret" do
      shopper = create(:discogs_shopper, oauth_token_secret: "secret-token-secret")
      expect(shopper.oauth_token_secret).to eq("secret-token-secret")

      raw = ActiveRecord::Base.connection.execute(
        "SELECT oauth_token_secret FROM discogs_shoppers WHERE id = #{shopper.id}"
      ).first["oauth_token_secret"]
      expect(raw).not_to eq("secret-token-secret")
    end
  end

  describe "#authenticated?" do
    it "returns true when both tokens are present" do
      shopper = build(:discogs_shopper, oauth_token: "token", oauth_token_secret: "secret")
      expect(shopper).to be_authenticated
    end

    it "returns false when tokens are nil" do
      shopper = build(:discogs_shopper, oauth_token: nil, oauth_token_secret: nil)
      expect(shopper).not_to be_authenticated
    end

    it "returns false when one token is missing" do
      shopper = build(:discogs_shopper, oauth_token: "token", oauth_token_secret: nil)
      expect(shopper).not_to be_authenticated
    end
  end

  describe "#touch_last_used!" do
    it "updates last_used_at" do
      shopper = create(:discogs_shopper, last_used_at: 1.day.ago)
      expect { shopper.touch_last_used! }
        .to change { shopper.reload.last_used_at }
    end
  end
end
