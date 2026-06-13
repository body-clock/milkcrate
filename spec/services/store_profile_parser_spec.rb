require "rails_helper"

RSpec.describe StoreProfileParser do
  describe "#genre_tags" do
    it "returns genre tags found in profile description" do
      parser = described_class.new("We sell punk, rock, and jazz records")
      expect(parser.genre_tags).to contain_exactly("punk", "rock", "jazz")
    end

    it "returns empty array when no genres found" do
      parser = described_class.new("Record shop in Brooklyn")
      expect(parser.genre_tags).to be_empty
    end

    it "handles nil description" do
      parser = described_class.new(nil)
      expect(parser.genre_tags).to be_empty
    end

    it "handles empty description" do
      parser = described_class.new("")
      expect(parser.genre_tags).to be_empty
    end

    it "deduplicates genre tags" do
      parser = described_class.new("Punk rock and more punk rock")
      expect(parser.genre_tags.count("punk")).to eq(1)
    end

    it "is case insensitive" do
      parser = described_class.new("PUNK and Rock")
      expect(parser.genre_tags).to contain_exactly("punk", "rock")
    end
  end
end
