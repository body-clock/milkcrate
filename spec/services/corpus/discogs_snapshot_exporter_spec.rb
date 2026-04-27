require "rails_helper"

RSpec.describe Corpus::DiscogsSnapshotExporter do
  let(:output_path) { Rails.root.join("tmp/test_discogs_snapshot.json") }
  let(:client) { instance_double(DiscogsClient) }

  before do
    allow(DiscogsClient).to receive(:new).and_return(client)
    allow(client).to receive(:seller_inventory).with("philadelphiamusic", page: 1).and_return(page_one)
    allow(client).to receive(:seller_inventory).with("philadelphiamusic", page: 2).and_return(page_two)
  end

  after do
    File.delete(output_path) if File.exist?(output_path)
  end

  let(:page_one) do
    {
      "pagination" => { "pages" => 2 },
      "listings" => [
        {
          "id" => 3002,
          "condition" => "VG+",
          "comments" => "Clean copy",
          "posted" => "2026-03-22T10:30:00-04:00",
          "price" => { "value" => "17.00", "currency" => "USD" },
          "release" => {
            "id" => 9002,
            "artist" => "Artist B",
            "title" => "Record B",
            "year" => 1984,
            "genres" => [ "Electronic" ],
            "styles" => [ "Ambient" ],
            "thumbnail" => "https://example.com/t2.jpg",
            "cover_image" => "https://example.com/c2.jpg",
            "labels" => [ { "name" => "Label B" } ],
            "formats" => [ { "name" => "Vinyl", "descriptions" => [ "LP" ] } ]
          }
        }
      ]
    }
  end

  let(:page_two) do
    {
      "pagination" => { "pages" => 2 },
      "listings" => [
        {
          "id" => 3001,
          "condition" => "VG",
          "comments" => nil,
          "posted" => "2026-03-22T09:30:00-04:00",
          "price" => { "value" => "19.00", "currency" => "USD" },
          "release" => {
            "id" => 9001,
            "artist" => "Artist A",
            "title" => "Record A",
            "year" => 1979,
            "genres" => [ "Jazz" ],
            "styles" => [ "Fusion" ],
            "thumbnail" => "https://example.com/t1.jpg",
            "cover_image" => "https://example.com/c1.jpg",
            "labels" => [ { "name" => "Label A" } ],
            "formats" => [ { "name" => "Vinyl", "descriptions" => [ "LP" ] } ]
          }
        }
      ]
    }
  end

  it "writes deterministic listing order and includes metadata envelope" do
    described_class.new(username: "philadelphiamusic", output_path:, max_pages: 2).call

    payload = JSON.parse(File.read(output_path))
    expect(payload.fetch("snapshot_version")).to eq(1)
    expect(payload.fetch("source").fetch("discogs_username")).to eq("philadelphiamusic")
    expect(payload.fetch("listings").map { |row| row.fetch("discogs_listing_id") }).to eq(%w[3001 3002])
  end
end
