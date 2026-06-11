require "rails_helper"

RSpec.describe GenreDiversityAnalyzer do
  let(:store) { create(:store) }

  def create_listings(genres_by_count)
    genres_by_count.each do |genre, count|
      count.times do
        create(:listing, store: store, genres: [genre])
      end
    end
  end

  describe "#call" do
    it "returns narrow: true for a store with 80%+ listings in one genre" do
      create_listings("Techno" => 80, "House" => 10, "Electronic" => 10)

      result = described_class.new(store: store).call

      expect(result[:narrow]).to be true
      expect(result[:dominant_genre]).to eq("Techno")
    end

    it "returns narrow: false for a store with distributed genres" do
      create_listings("Electronic" => 35, "Rock" => 35, "Jazz" => 30)

      result = described_class.new(store: store).call

      expect(result[:narrow]).to be false
      expect(result[:dominant_genre]).to be_nil
    end

    it "returns top 3 genres sorted by count" do
      create_listings("Techno" => 50, "House" => 30, "Electronic" => 15, "Jazz" => 5)

      result = described_class.new(store: store).call

      expect(result[:top_genres]).to eq([ "Techno", "House", "Electronic" ])
    end

    it "handles stores with zero listings" do
      result = described_class.new(store: store).call

      expect(result[:narrow]).to be false
      expect(result[:dominant_genre]).to be_nil
      expect(result[:top_genres]).to eq([])
    end

    it "handles stores with nil genres in some listings" do
      create(:listing, store: store, genres: [])
      create(:listing, store: store, genres: nil)
      create_listings("Techno" => 3)

      result = described_class.new(store: store).call

      expect(result[:narrow]).to be true
      expect(result[:dominant_genre]).to eq("Techno")
    end

    it "classifies store with exactly 80% as narrow" do
      create_listings("Techno" => 80, "House" => 20)

      result = described_class.new(store: store).call

      expect(result[:narrow]).to be true
    end

    it "classifies store with 79% as broad" do
      create_listings("Techno" => 79, "House" => 21)

      result = described_class.new(store: store).call

      expect(result[:narrow]).to be false
    end
  end
end
