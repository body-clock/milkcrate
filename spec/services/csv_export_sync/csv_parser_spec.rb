require "rails_helper"

RSpec.describe CsvExportSync::CsvParser do
  subject(:parser) { described_class.new }

  let(:csv_headers) do
    "listing_id,release_id,artist,title,label,catno,format,media_condition,price,listed,comments,status"
  end

  describe "#call" do
    context "with a valid CSV" do
      let(:csv_body) do
        <<~CSV
          #{csv_headers}
          123,456,Artist Name,Song Title,Test Label,CAT001,Vinyl,Very Good Plus (VG+),12.99,2026-01-15 10:00:00 UTC,,For Sale
          124,457,Another Artist,Another Title,,CAT002,Vinyl,Mint (M),25.00,2026-02-20 14:30:00 UTC,Great record,For Sale
        CSV
      end

      it "parses all rows including headers" do
        result = parser.call(csv_body, store_id: 1)
        expect(result.records.size).to eq(2)
      end

      it "coerces field types correctly" do
        result = parser.call(csv_body, store_id: 1)
        first = result.records.first

        expect(first[:discogs_listing_id]).to eq("123")
        expect(first[:discogs_release_id]).to eq("456")
        expect(first[:artist]).to eq("Artist Name")
        expect(first[:price]).to eq(12.99)
        expect(first[:listed_at]).to be_a(Time)
        expect(first[:store_id]).to eq(1)
      end

      it "includes raw status in the record" do
        result = parser.call(csv_body, store_id: 1)
        expect(result.records.first[:_status]).to eq("For Sale")
      end

      it "sets last_seen_at on all records" do
        result = parser.call(csv_body, store_id: 1)
        expect(result.records).to all(have_key(:last_seen_at))
      end
    end

    context "with sold/draft listings" do
      let(:csv_body) do
        <<~CSV
          #{csv_headers}
          123,456,Artist,Title,TEST,CAT001,Vinyl,Very Good Plus (VG+),12.99,2026-01-15,,Sold
        CSV
      end

      it "parses sold listings (filtering is a separate step)" do
        result = parser.call(csv_body, store_id: 1)
        expect(result.records.size).to eq(1)
        expect(result.records.first[:_status]).to eq("Sold")
      end
    end

    context "with non-vinyl formats" do
      let(:csv_body) do
        <<~CSV
          #{csv_headers}
          123,456,Artist,Title,TEST,CAT001,CD,Very Good Plus (VG+),12.99,2026-01-15,,For Sale
        CSV
      end

      it "parses non-vinyl rows (filtering is a separate step)" do
        result = parser.call(csv_body, store_id: 1)
        expect(result.records.size).to eq(1)
        expect(result.records.first[:format]).to eq("CD")
      end
    end

    context "with an empty CSV" do
      let(:csv_body) { csv_headers + "\n" }

      it "returns an empty result" do
        result = parser.call(csv_body, store_id: 1)
        expect(result.records).to be_empty
      end
    end

    context "with malformed CSV" do
      let(:csv_body) { "listing_id,title\n\"unclosed\n" }

      it "raises a ParseError" do
        expect { parser.call(csv_body, store_id: 1) }
          .to raise_error(CsvExportSync::ParseError, /CSV parsing failed/)
      end
    end
  end
end
