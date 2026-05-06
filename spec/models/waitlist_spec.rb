require "rails_helper"

RSpec.describe Waitlist, type: :model do
  describe "validations" do
    it "is valid with all required attributes" do
      expect(build(:waitlist)).to be_valid
    end

    it "requires name" do
      expect(build(:waitlist, name: nil)).not_to be_valid
    end

    it "requires email" do
      expect(build(:waitlist, email: nil)).not_to be_valid
    end

    it "requires discogs_username" do
      expect(build(:waitlist, discogs_username: nil)).not_to be_valid
    end

    it "rejects malformed email" do
      expect(build(:waitlist, email: "notanemail")).not_to be_valid
    end

    it "accepts valid email" do
      expect(build(:waitlist, email: "hello@mystore.com")).to be_valid
    end

    it "allows blank inventory_size" do
      expect(build(:waitlist, inventory_size: nil)).to be_valid
    end

    it "allows blank notes" do
      expect(build(:waitlist, notes: nil)).to be_valid
    end

    it "enforces unique discogs_username" do
      create(:waitlist, discogs_username: "unique_store")
      dup = build(:waitlist, discogs_username: "unique_store")
      expect(dup).not_to be_valid
      expect(dup.errors[:discogs_username]).to include("has already been taken")
    end
  end
end
