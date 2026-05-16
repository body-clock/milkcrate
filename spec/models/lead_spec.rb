require "rails_helper"

RSpec.describe Lead, type: :model do
  describe "validations" do
    it "creates a valid lead with all attributes" do
      lead = build(:lead)
      expect(lead).to be_valid
    end

    it "requires a discogs_username" do
      lead = build(:lead, discogs_username: nil)
      expect(lead).not_to be_valid
      expect(lead.errors[:discogs_username]).to include("can't be blank")
    end

    it "requires a unique discogs_username (case insensitive)" do
      create(:lead, discogs_username: "analog_attic")
      lead = build(:lead, discogs_username: "ANALOG_ATTIC")
      expect(lead).not_to be_valid
      expect(lead.errors[:discogs_username]).to include("has already been taken")
    end
  end

  describe "normalization" do
    it "downcases discogs_username on save" do
      lead = create(:lead, discogs_username: "ANALOG_ATTIC")
      expect(lead.discogs_username).to eq("analog_attic")
    end
  end

  describe "scopes" do
    let!(:high_score) { create(:lead, score: 85, status: :pending) }
    let!(:medium_score) { create(:lead, score: 60, status: :pending) }
    let!(:reviewed_lead) { create(:lead, score: 75, status: :reviewed) }

    it "scored_above returns leads above threshold" do
      expect(Lead.scored_above(70)).to contain_exactly(high_score, reviewed_lead)
    end

    it "by_status filters by status" do
      expect(Lead.by_status(:pending)).to contain_exactly(high_score, medium_score)
      expect(Lead.by_status(:reviewed)).to contain_exactly(reviewed_lead)
    end

    it "with_discogs_username finds by username case-insensitively" do
      expect(Lead.with_discogs_username(high_score.discogs_username.upcase)).to contain_exactly(high_score)
    end

    it "by_score orders descending" do
      expect(Lead.by_score).to eq([ high_score, reviewed_lead, medium_score ])
    end

    it "newest_first orders by created_at descending" do
      expect(Lead.newest_first).to eq([ reviewed_lead, medium_score, high_score ])
    end
  end

  describe "#needs_scoring?" do
    it "returns true when scored_at is nil" do
      lead = build(:lead, scored_at: nil)
      expect(lead.needs_scoring?).to be true
    end

    it "returns true when updated after scoring" do
      lead = create(:lead, scored_at: 1.hour.ago)
      lead.touch
      expect(lead.needs_scoring?).to be true
    end

    it "returns false when scored_at is current" do
      lead = build(:lead, scored_at: Time.current)
      expect(lead.needs_scoring?).to be false
    end
  end

  describe "status enum" do
    it "defaults to pending" do
      lead = create(:lead)
      expect(lead.status).to eq("pending")
      expect(lead).to be_pending
    end

    it "allows transitioning through valid statuses" do
      lead = create(:lead, status: :pending)
      lead.update!(status: :reviewed)
      expect(lead).to be_reviewed
      lead.update!(status: :contacted)
      expect(lead).to be_contacted
      lead.update!(status: :onboarded)
      expect(lead).to be_onboarded
    end

    it "allows dismissing a lead" do
      lead = create(:lead, status: :pending)
      lead.update!(status: :dismissed)
      expect(lead).to be_dismissed
    end
  end
end
