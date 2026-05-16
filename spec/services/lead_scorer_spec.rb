require "rails_helper"

RSpec.describe LeadScorer do
  subject(:scorer) { described_class.new }

  # Build a lead with only the fields the scorer reads.
  def build_lead(attrs)
    instance_double(Lead, {
      inventory_size: 0,
      vinyl_percentage: 0,
      genres: [],
      web_presence: nil
    }.merge(attrs))
  end

  describe "#score" do
    it "returns a hash with score and dimensions" do
      lead = build_lead(inventory_size: 1_800, vinyl_percentage: 92.00, genres: %w[Jazz Soul Funk Electronic Blues])
      result = scorer.score(lead)

      expect(result).to have_key(:score)
      expect(result).to have_key(:dimensions)
      expect(result[:dimensions]).to have_key(:inventory_size)
      expect(result[:dimensions]).to have_key(:vinyl_share)
      expect(result[:dimensions]).to have_key(:genre_depth)
      expect(result[:dimensions]).to have_key(:presence_penalty)
    end

    context "with an ideal seller" do
      let(:lead) { build_lead(inventory_size: 1_800, vinyl_percentage: 92.00, genres: %w[Jazz Soul Funk Electronic Blues]) }

      it "scores highly with no penalty" do
        result = scorer.score(lead)
        expect(result[:score]).to be > 70
        expect(result[:dimensions][:inventory_size]).to eq(100)
        expect(result[:dimensions][:vinyl_share]).to eq(100)
        expect(result[:dimensions][:genre_depth]).to eq(100)
        expect(result[:dimensions][:presence_penalty]).to eq(0)
      end
    end

    context "with seller below 100 inventory" do
      let(:lead) { build_lead(inventory_size: 50, vinyl_percentage: 90.00, genres: %w[Jazz]) }

      it "scores inventory_size at 0 but other dimensions still contribute" do
        result = scorer.score(lead)
        expect(result[:dimensions][:inventory_size]).to eq(0)
        # Other dimensions still contribute, so overall score > 0
        expect(result[:score]).to be > 0
      end
    end

    context "with seller above 5000 inventory" do
      let(:lead) { build_lead(inventory_size: 6_000, vinyl_percentage: 90.00, genres: %w[Jazz]) }

      it "scores inventory_size at 0" do
        result = scorer.score(lead)
        expect(result[:dimensions][:inventory_size]).to eq(0)
        expect(result[:score]).to be > 0
      end
    end

    context "with seller in 100-499 range (low-confidence tier)" do
      let(:lead) { build_lead(inventory_size: 300, vinyl_percentage: 85.00, genres: %w[Jazz Soul]) }

      it "assigns reduced inventory score" do
        result = scorer.score(lead)
        expect(result[:dimensions][:inventory_size]).to eq(40)
        expect(result[:score]).to be > 0
      end
    end

    context "with nil vinyl_percentage" do
      let(:lead) { build_lead(inventory_size: 1_800, vinyl_percentage: nil, genres: %w[Jazz Soul Funk]) }

      it "scores vinyl_share as 0" do
        result = scorer.score(lead)
        expect(result[:dimensions][:vinyl_share]).to eq(0)
      end
    end

    context "with 50% vinyl share" do
      let(:lead) { build_lead(inventory_size: 1_800, vinyl_percentage: 50.00, genres: %w[Jazz]) }

      it "scores vinyl_share at the lowest tier" do
        result = scorer.score(lead)
        expect(result[:dimensions][:vinyl_share]).to eq(30)
      end
    end

    context "with blank genres" do
      let(:lead) { build_lead(inventory_size: 1_800, vinyl_percentage: 90.00, genres: []) }

      it "scores genre_depth as 0" do
        result = scorer.score(lead)
        expect(result[:dimensions][:genre_depth]).to eq(0)
      end
    end

    context "with standalone ecommerce presence" do
      let(:lead) do
        build_lead(
          inventory_size: 1_800,
          vinyl_percentage: 92.00,
          genres: %w[Jazz Soul Funk],
          web_presence: { "classified_as" => "standalone_ecommerce", "shopify" => "analogattic.myshopify.com" }
        )
      end

      it "applies the presence penalty" do
        result = scorer.score(lead)
        expect(result[:dimensions][:presence_penalty]).to eq(100)
        # The penalty is heavy enough to significantly drop the score
        expect(result[:score]).to be < 50
      end
    end

    context "with social-media-only web presence" do
      let(:lead) do
        build_lead(
          inventory_size: 1_800,
          vinyl_percentage: 92.00,
          genres: %w[Jazz Soul Funk],
          web_presence: { "classified_as" => "social_media", "instagram" => "instagram.com/analog_attic" }
        )
      end

      it "does not apply the penalty" do
        result = scorer.score(lead)
        expect(result[:dimensions][:presence_penalty]).to eq(0)
      end
    end

    context "with all maximum values" do
      let(:lead) { build_lead(inventory_size: 2_500, vinyl_percentage: 99.00, genres: %w[A B C D E F]) }

      it "scores 100" do
        result = scorer.score(lead)
        expect(result[:score]).to eq(100.0)
      end
    end

    context "with all minimum values" do
      let(:lead) { build_lead(inventory_size: 0, vinyl_percentage: 0.0, genres: []) }

      it "scores 0" do
        result = scorer.score(lead)
        expect(result[:score]).to eq(0.0)
      end
    end

    context "with vinyl_percentage expressed as decimal (0.92)" do
      let(:lead) { build_lead(inventory_size: 1_800, vinyl_percentage: 0.92, genres: %w[Jazz Soul]) }

      it "normalizes correctly" do
        result = scorer.score(lead)
        expect(result[:dimensions][:vinyl_share]).to eq(100)
      end
    end

    context "with vinyl at target threshold (70%)" do
      let(:lead) { build_lead(inventory_size: 1_800, vinyl_percentage: 70.00, genres: %w[Jazz]) }

      it "scores 60" do
        result = scorer.score(lead)
        expect(result[:dimensions][:vinyl_share]).to eq(60)
      end
    end
  end
end
