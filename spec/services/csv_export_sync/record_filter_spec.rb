require "rails_helper"

RSpec.describe CsvExportSync::RecordFilter do
  describe ".call" do
    it "keeps vinyl records that are for sale" do
      records = [
        { discogs_listing_id: "1", format: "Vinyl", _status: "For Sale" }
      ]
      expect(described_class.call(records).size).to eq(1)
    end

    it "filters out non-vinyl formats" do
      records = [
        { discogs_listing_id: "1", format: "CD", _status: "For Sale" },
        { discogs_listing_id: "2", format: "Cassette", _status: "For Sale" },
        { discogs_listing_id: "3", format: "Vinyl", _status: "For Sale" }
      ]
      expect(described_class.call(records).size).to eq(1)
    end

    it "filters out sold listings" do
      records = [
        { discogs_listing_id: "1", format: "Vinyl", _status: "Sold" },
        { discogs_listing_id: "2", format: "Vinyl", _status: "For Sale" },
        { discogs_listing_id: "3", format: "Vinyl", _status: "Draft" },
        { discogs_listing_id: "4", format: "Vinyl", _status: "Expired" }
      ]
      expect(described_class.call(records).size).to eq(1)
    end

    it "filters out records without a listing_id" do
      records = [
        { discogs_listing_id: nil, format: "Vinyl", _status: "For Sale" },
        { discogs_listing_id: "", format: "Vinyl", _status: "For Sale" },
        { discogs_listing_id: "3", format: "Vinyl", _status: "For Sale" }
      ]
      expect(described_class.call(records).size).to eq(1)
    end

    it "handles nil format (treats as vinyl)" do
      records = [
        { discogs_listing_id: "1", format: nil, _status: "For Sale" }
      ]
      expect(described_class.call(records).size).to eq(1)
    end

    it "handles nil status (treats as available)" do
      records = [
        { discogs_listing_id: "1", format: "Vinyl", _status: nil }
      ]
      expect(described_class.call(records).size).to eq(1)
    end
  end
end
