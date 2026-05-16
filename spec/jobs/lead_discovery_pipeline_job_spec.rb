require "rails_helper"

RSpec.describe LeadDiscoveryPipelineJob, type: :job do
  describe "#perform" do
    let!(:pending_lead) { create(:lead, status: :pending, score: nil, scored_at: nil, web_presence: nil) }
    let!(:already_scored_lead) { create(:lead, status: :pending, score: 75.0, scored_at: 1.hour.from_now, web_presence: { "classified_as" => "no_presence" }) }
    let!(:dismissed_lead) { create(:lead, status: :dismissed, score: nil, scored_at: nil, web_presence: nil) }

    before do
      discovery_result = instance_double(LeadDiscoveryService::Result,
        leads_created: 2, leads_updated: 1, errors: [])
      allow(LeadDiscoveryService).to receive(:call)
        .with(seed_usernames: []).and_return(discovery_result)
    end

    it "scores pending leads that haven't been scored" do
      expect {
        described_class.perform_now
      }.to change { pending_lead.reload.score }.from(nil)
    end

    it "stores score_breakdown on scored leads" do
      described_class.perform_now
      pending_lead.reload
      expect(pending_lead.score_breakdown).to be_present
      expect(pending_lead.score_breakdown).to have_key("inventory_size")
      expect(pending_lead.scored_at).to be_present
    end

    it "does not re-score leads scored in the same transaction" do
      expect {
        described_class.perform_now
      }.not_to change { already_scored_lead.reload.score }
    end

    it "skips dismissed leads" do
      expect {
        described_class.perform_now
      }.not_to change { dismissed_lead.reload.scored_at }
    end

    it "passes seed_usernames to LeadDiscoveryService" do
      expect(LeadDiscoveryService).to receive(:call)
        .with(seed_usernames: [ "test_seller" ])
        .and_return(instance_double(LeadDiscoveryService::Result, leads_created: 0, leads_updated: 0, errors: []))

      described_class.perform_now(seed_usernames: [ "test_seller" ])
    end

    context "with a scoring error" do
      before do
        allow_any_instance_of(LeadScorer).to receive(:score).and_raise(StandardError, "scoring failed")

        # Stub web presence checker to prevent cascading errors in stage 3
        checker = instance_double(LeadDiscovery::WebPresenceChecker)
        allow(LeadDiscovery::WebPresenceChecker).to receive(:new).and_return(checker)
        allow(checker).to receive(:check_and_store!).and_return(nil)
      end

      it "logs the error and continues" do
        expect(Rails.logger).to receive(:warn).with(/error/).at_least(:once)
        described_class.perform_now
      end
    end

    context "with a web presence check" do
      before do
        # Stub web presence checker
        checker = instance_double(LeadDiscovery::WebPresenceChecker)
        allow(LeadDiscovery::WebPresenceChecker).to receive(:new).and_return(checker)

        result = instance_double(LeadDiscovery::WebPresenceChecker::Result,
          to_h: { "classified_as" => "no_presence", "platforms" => {}, "listed_urls" => [], "notes" => "No presence" })
        allow(checker).to receive(:check).and_return(result)
        allow(checker).to receive(:check_and_store!).and_return(result)
      end

      it "checks web presence for leads with scored_at but no web_presence" do
        pending_lead.update!(scored_at: 5.minutes.ago, score: 50.0)
        described_class.perform_now
        expect(LeadDiscovery::WebPresenceChecker).to have_received(:new).at_least(:once)
      end
    end
  end
end
