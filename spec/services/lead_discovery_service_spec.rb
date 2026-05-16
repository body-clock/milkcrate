require "rails_helper"

RSpec.describe LeadDiscoveryService do
  describe ".call" do
    let(:client) { instance_double(DiscogsClient) }
    let(:candidate) do
      LeadDiscovery::SellerFinder::Candidate.new(
        discogs_username: "analog_attic",
        store_name: "Analog Attic Records",
        inventory_size: 1_800,
        sampled_listings: [ { "id" => 1, "release" => { "format" => "Vinyl" } } ],
        vinyl_count: 1_600,
        vinyl_percentage: 88.89,
        genres: [ "Jazz", "Soul", "Funk" ],
        styles: [ "Modal", "Deep Funk" ],
        discogs_profile: { "name" => "Analog Attic Records", "location" => "Brooklyn, NY" }
      )
    end

    before do
      finder = instance_double(LeadDiscovery::SellerFinder)
      allow(LeadDiscovery::SellerFinder).to receive(:new).with(client: client).and_return(finder)
      allow(finder).to receive(:find_candidates).with(seed_usernames: []).and_return([ candidate ])
    end

    it "creates Lead records from discovered candidates" do
      result = described_class.call(client: client)

      expect(result.leads_created).to eq(1)
      expect(result.leads_updated).to eq(0)
      expect(result.errors).to be_empty

      lead = Lead.find_by(discogs_username: "analog_attic")
      expect(lead).not_to be_nil
      expect(lead.store_name).to eq("Analog Attic Records")
      expect(lead.inventory_size).to eq(1_800)
      expect(lead.vinyl_percentage).to eq(88.89)
      expect(lead.genres).to match_array([ "Jazz", "Soul", "Funk" ])
      expect(lead).to be_pending
    end

    it "returns a Result with counts" do
      result = described_class.call(client: client)
      expect(result).to be_a(Data)
      expect(result.respond_to?(:leads_created)).to be true
      expect(result.respond_to?(:leads_updated)).to be true
      expect(result.respond_to?(:errors)).to be true
    end

    context "when a lead already exists" do
      let!(:existing_lead) { create(:lead, discogs_username: "analog_attic", store_name: "Old Name", inventory_size: 500) }

      it "updates the existing lead" do
        result = described_class.call(client: client)

        expect(result.leads_created).to eq(0)
        expect(result.leads_updated).to eq(1)

        existing_lead.reload
        expect(existing_lead.store_name).to eq("Analog Attic Records")
        expect(existing_lead.inventory_size).to eq(1_800)
      end
    end

    context "with seed_usernames" do
      let(:seed_candidate) do
        LeadDiscovery::SellerFinder::Candidate.new(
          discogs_username: "seed_seller",
          store_name: "Seed Seller",
          inventory_size: 1_200,
          sampled_listings: [ { "id" => 1, "release" => { "format" => "Vinyl" } } ],
          vinyl_count: 1_000,
          vinyl_percentage: 83.33,
          genres: [ "Rock" ],
          styles: [],
          discogs_profile: {}
        )
      end

      before do
        finder = instance_double(LeadDiscovery::SellerFinder)
        allow(LeadDiscovery::SellerFinder).to receive(:new).with(client: client).and_return(finder)
        allow(finder).to receive(:find_candidates).with(seed_usernames: [ "seed_seller" ]).and_return([ seed_candidate ])
      end

      it "passes seed_usernames to SellerFinder" do
        result = described_class.call(client: client, seed_usernames: [ "seed_seller" ])
        expect(result.leads_created).to eq(1)
        expect(Lead.find_by(discogs_username: "seed_seller")).not_to be_nil
      end
    end

    context "when candidate creation fails" do
      before do
        allow_any_instance_of(Lead).to receive(:save!).and_raise(ActiveRecord::RecordInvalid)
      end

      it "collects errors and continues" do
        result = described_class.call(client: client)
        expect(result.leads_created).to eq(0)
        expect(result.errors).not_to be_empty
        expect(result.errors.first[:username]).to eq("analog_attic")
      end
    end
  end
end
