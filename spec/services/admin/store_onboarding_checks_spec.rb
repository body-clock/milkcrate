require "rails_helper"

RSpec.describe Admin::StoreOnboardingChecks do
  describe "#call" do
    it "returns valid when username has no conflicts" do
      result = described_class.new("new-user").call

      expect(result.valid).to be(true)
      expect(result.error_message).to be_nil
    end

    it "returns invalid for blank username" do
      result = described_class.new("").call

      expect(result.valid).to be(false)
      expect(result.error_message).to eq("Discogs username is required")
    end

    it "returns invalid when store already exists" do
      create(:store, discogs_username: "existing-store")
      result = described_class.new("existing-store").call

      expect(result.valid).to be(false)
      expect(result.error_message).to include("already exists")
    end

    it "returns invalid when applicant exists and check_applicant is true" do
      create(:waitlist, discogs_username: "applicant-user")
      result = described_class.new("applicant-user", check_applicant: true).call

      expect(result.valid).to be(false)
      expect(result.error_message).to include("applicant")
    end

    it "skips applicant check when check_applicant is false" do
      create(:waitlist, discogs_username: "applicant-user")
      result = described_class.new("applicant-user", check_applicant: false).call

      expect(result.valid).to be(true)
    end
  end
end
