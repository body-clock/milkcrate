require "rails_helper"

RSpec.describe SyncStrategies::CsvExport do
  subject(:strategy) { described_class.new }

  let(:store) { build_stubbed(:store, store_owner:) }
  let(:store_owner) { build_stubbed(:store_owner, discogs_oauth_token: "token", discogs_oauth_token_secret: "secret") }

  let(:export_requester) { instance_double(CsvExportSync::ExportRequester) }
  let(:csv_parser) { instance_double(CsvExportSync::CsvParser) }

  let(:csv_body) { "listing_id,artist,title,price,status\n1,Test Artist,Test Title,10.00,For Sale" }
  let(:export_id) { 42 }

  let(:parsed_records) do
    [
      { discogs_listing_id: "1", artist: "Test Artist", title: "Test Title",
        price: 10.00, store_id: store.id, last_seen_at: Time.current }
    ]
  end

  before do
    allow(CsvExportSync::ExportRequester).to receive(:new).and_return(export_requester)
    allow(export_requester).to receive(:call).and_return(
      CsvExportSync::ExportRequester::Result.new(csv_body:, export_id:)
    )

    allow(CsvExportSync::CsvParser).to receive(:new).and_return(csv_parser)
    allow(csv_parser).to receive(:call).with(csv_body, store_id: store.id).and_return(
      CsvExportSync::CsvParser::Result.new(records: parsed_records)
    )
  end

  describe "#call" do
    context "with a valid OAuth-authorized store" do
      it "returns a SyncStrategies::Result with complete?: true" do
        result = strategy.call(store)

        expect(result).to be_a(SyncStrategies::Result)
        expect(result.complete?).to be(true)
      end

      it "returns the filtered listings after parsing" do
        result = strategy.call(store)

        expect(result.listings).to be_an(Array)
        expect(result.listings).not_to be_empty
        expect(result.listings.first[:discogs_listing_id]).to eq("1")
      end

      it "removes the transient _status field from listings" do
        parsed_with_status = [
          { discogs_listing_id: "1", artist: "Test Artist", title: "Test Title",
            price: 10.00, store_id: store.id, _status: "For Sale" }
        ]
        allow(csv_parser).to receive(:call).with(csv_body, store_id: store.id).and_return(
          CsvExportSync::CsvParser::Result.new(records: parsed_with_status)
        )

        result = strategy.call(store)

        expect(result.listings.first).not_to have_key(:_status)
      end

      it "calls RecordFilter on the parsed records" do
        expect(CsvExportSync::RecordFilter).to receive(:call).with(parsed_records).and_call_original

        strategy.call(store)
      end

      it "builds the OAuth client from the store owner" do
        expect(DiscogsClient).to receive(:new).with(
          access_token: "token",
          access_token_secret: "secret"
        ).and_call_original

        strategy.call(store)
      end
    end

    context "when given a custom client" do
      let(:custom_client) { instance_double(DiscogsClient) }

      subject(:strategy) { described_class.new(client: custom_client) }

      before do
        allow(CsvExportSync::ExportRequester).to receive(:new).with(client: custom_client).and_return(export_requester)
      end

      it "uses the custom client instead of building one" do
        expect(DiscogsClient).not_to receive(:new)
        strategy.call(store)
      end
    end

    context "when the store has no store_owner" do
      let(:store_owner) { nil }

      it "raises NotAuthorizedError" do
        expect { strategy.call(store) }.to raise_error(
          SyncStrategies::CsvExport::NotAuthorizedError,
          /has no store owner/
        )
      end
    end

    context "when the CSV export fails" do
      before do
        allow(export_requester).to receive(:call).and_raise(
          CsvExportSync::ExportRequester::ExportError, "Export failed"
        )
      end

      it "propagates the error" do
        expect { strategy.call(store) }.to raise_error(
          CsvExportSync::ExportRequester::ExportError, /Export failed/
        )
      end
    end

    context "when all records are filtered out by RecordFilter" do
      before do
        allow(CsvExportSync::RecordFilter).to receive(:call).and_return([])
      end

      it "returns empty listings with complete?: true" do
        result = strategy.call(store)

        expect(result.listings).to be_empty
        expect(result.complete?).to be(true)
      end
    end
  end
end
