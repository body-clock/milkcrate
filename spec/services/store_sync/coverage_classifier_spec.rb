require "rails_helper"

RSpec.describe StoreSync::CoverageClassifier do
  describe "#call" do
    it "classifies stores within the public page window as near_complete" do
      coverage = described_class.new(observed_page_count: 100, max_pages: nil).call

      expect(coverage).to eq("near_complete")
    end

    it "classifies stores above the public page window as partial" do
      coverage = described_class.new(observed_page_count: 101, max_pages: nil).call

      expect(coverage).to eq("partial")
    end

    it "classifies truncated developer syncs as partial" do
      coverage = described_class.new(observed_page_count: 5, max_pages: 1).call

      expect(coverage).to eq("partial")
    end
  end
end
