require "rails_helper"

RSpec.describe WantHaveRatio do
  describe "#ratio" do
    it "divides want by have" do
      expect(described_class.new(10, 5).ratio).to eq(2.0)
    end

    it "returns 0.0 when have is zero" do
      expect(described_class.new(10, 0).ratio).to eq(0.0)
    end

    it "returns 0.0 when have is nil" do
      expect(described_class.new(10, nil).ratio).to eq(0.0)
    end

    it "returns 0.0 when both are zero" do
      expect(described_class.new(0, 0).ratio).to eq(0.0)
    end

    it "returns 0.0 when both are nil" do
      expect(described_class.new(nil, nil).ratio).to eq(0.0)
    end

    it "coerces string inputs" do
      expect(described_class.new("10", "5").ratio).to eq(2.0)
    end
  end

  describe "#high?" do
    it "returns true when ratio >= 2.0 and have >= 10" do
      expect(described_class.new(20, 10).high?).to be(true)
    end

    it "returns false when have is below MIN_HAVE" do
      expect(described_class.new(20, 5).high?).to be(false)
    end

    it "returns false when ratio is below threshold" do
      expect(described_class.new(10, 10).high?).to be(false)
    end

    it "returns false when both are zero" do
      expect(described_class.new(0, 0).high?).to be(false)
    end

    it "returns false when both are nil" do
      expect(described_class.new(nil, nil).high?).to be(false)
    end
  end

  describe "#low?" do
    it "returns true when ratio <= 0.5 and have >= 10" do
      expect(described_class.new(5, 10).low?).to be(true)
    end

    it "returns true when want is zero and have >= 10" do
      expect(described_class.new(0, 10).low?).to be(true)
    end

    it "returns false when ratio is 1.0 (above threshold)" do
      expect(described_class.new(10, 10).low?).to be(false)
    end

    it "returns false when have is below MIN_HAVE" do
      expect(described_class.new(1, 5).low?).to be(false)
    end

    it "returns false when both are zero" do
      expect(described_class.new(0, 0).low?).to be(false)
    end

    it "returns false when both are nil" do
      expect(described_class.new(nil, nil).low?).to be(false)
    end
  end

  describe "#log_base_score" do
    it "returns log10 of total, clamped to 2.0" do
      expect(described_class.new(1000, 9000).log_base_score).to eq(2.0)
    end

    it "returns 0.0 when total is zero" do
      expect(described_class.new(0, 0).log_base_score).to eq(0.0)
    end

    it "returns positive value for moderate totals" do
      score = described_class.new(100, 100).log_base_score
      expect(score).to be_between(2.0, 3.0)
    end

    it "handles nil inputs" do
      expect(described_class.new(nil, nil).log_base_score).to eq(0.0)
    end
  end
end
