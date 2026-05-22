require "rails_helper"

RSpec.describe ScoreStrategies::CoverQualityStrategy do
  subject(:strategy) { described_class.new }

  describe "#score" do
    it "returns 1.0 when cover and thumbnail differ" do
      expect(strategy.score(build_listing(
        cover_image_url: "https://example.com/cover.jpg",
        thumbnail_url: "https://example.com/thumb.jpg"
      ))).to eq(1.0)
    end

    it "returns 0.0 when both cover and thumbnail are nil" do
      expect(strategy.score(build_listing(cover_image_url: nil, thumbnail_url: nil))).to eq(0.0)
    end

    it "returns -1.0 when cover equals thumbnail" do
      expect(strategy.score(build_listing(
        cover_image_url: "https://example.com/img.jpg",
        thumbnail_url: "https://example.com/img.jpg"
      ))).to eq(-1.0)
    end

    it "returns -1.0 when cover is nil but thumbnail is present" do
      expect(strategy.score(build_listing(cover_image_url: nil, thumbnail_url: "thumb.jpg"))).to eq(-1.0)
    end

    it "returns -1.0 when thumbnail is nil but cover is present" do
      expect(strategy.score(build_listing(cover_image_url: "cover.jpg", thumbnail_url: nil))).to eq(-1.0)
    end
  end
end
