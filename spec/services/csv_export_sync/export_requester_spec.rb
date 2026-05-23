require "rails_helper"

RSpec.describe CsvExportSync::ExportRequester do
  subject(:requester) { described_class.new(client: client) }

  let(:client) { instance_double(DiscogsClient) }
  let(:csv_body) do
    "listing_id,artist,title,status\n1,Test Artist,Test Title,For Sale"
  end

  before do
    allow(requester).to receive(:sleep)
  end

  def stub_successful_export(export_id: 42, csv_body: nil)
    csv_body ||= self.csv_body
    allow(client).to receive(:inventory_export).and_return({ "id" => export_id })
    allow(client).to receive(:check_export_status).with(export_id).and_return({ "status" => "completed" })
    allow(client).to receive(:download_export).with(export_id).and_return(csv_body)
  end

  describe "#call" do
    it "returns the exported csv and export id" do
      stub_successful_export

      result = requester.call

      expect(result.export_id).to eq(42)
      expect(result.csv_body).to include("Test Title")
    end

    it "falls back to the existing export when Discogs reports a 409 conflict" do
      allow(client).to receive(:inventory_export).and_raise(DiscogsClient::ApiError, "Discogs API error: 409 — conflict")
      allow(client).to receive(:recent_exports).and_return([ { "id" => 99 } ])
      allow(client).to receive(:check_export_status).with(99).and_return({ "status" => "completed" })
      allow(client).to receive(:download_export).with(99).and_return(csv_body)

      result = requester.call

      expect(result.export_id).to eq(99)
      expect(result.csv_body).to include("Test Title")
    end

    it "raises when Discogs reports a 409 conflict but no recent exports exist" do
      allow(client).to receive(:inventory_export).and_raise(DiscogsClient::ApiError, "Discogs API error: 409 — conflict")
      allow(client).to receive(:recent_exports).and_return([])

      expect { requester.call }.to raise_error(CsvExportSync::ExportRequester::ExportError, /No recent export found/)
    end

    it "raises when recent exports do not include an export id" do
      allow(client).to receive(:inventory_export).and_raise(DiscogsClient::ApiError, "Discogs API error: 409 — conflict")
      allow(client).to receive(:recent_exports).and_return([ { "status" => "queued" } ])

      expect { requester.call }.to raise_error(
        CsvExportSync::ExportRequester::ExportError,
        /Could not determine export ID from recent exports/
      )
    end

    it "keeps polling through not_modified responses" do
      allow(client).to receive(:inventory_export).and_return({ "id" => 42 })
      allow(client).to receive(:check_export_status).with(42).and_return(
        { "status" => "not_modified" },
        { "status" => "completed" }
      )
      allow(client).to receive(:download_export).with(42).and_return(csv_body)

      result = requester.call

      expect(result.export_id).to eq(42)
      expect(client).to have_received(:check_export_status).with(42).twice
    end

    it "raises when export polling reports failure" do
      allow(client).to receive(:inventory_export).and_return({ "id" => 42 })
      allow(client).to receive(:check_export_status).with(42).and_return({ "status" => "failed" })

      expect { requester.call }.to raise_error(
        CsvExportSync::ExportRequester::ExportError,
        /Export failed with status: failed/
      )
    end

    it "raises when polling exceeds the maximum attempts" do
      stub_const("CsvExportSync::ExportRequester::MAX_POLL_ATTEMPTS", 2)
      allow(client).to receive(:inventory_export).and_return({ "id" => 42 })
      allow(client).to receive(:check_export_status).with(42).and_return({ "status" => "not_modified" })

      expect { requester.call }.to raise_error(
        CsvExportSync::ExportRequester::ExportError,
        /Export timed out after/
      )
    end
  end
end
