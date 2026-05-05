require "rails_helper"

RSpec.describe StoreSync::ListingReconciler do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { create(:store) }

  around do |example|
    travel_to(Time.zone.parse("2026-05-05 12:00:00")) { example.run }
  end

  def listing_payload(id:, release_id:, price: "12.50", condition: "VG+", format: "Vinyl", notes: nil)
    {
      "id" => id,
      "condition" => condition,
      "comments" => notes,
      "price" => { "value" => price, "currency" => "USD" },
      "posted" => "2026-01-01T00:00:00-07:00",
      "release" => {
        "id" => release_id,
        "format" => format,
        "formats" => [ { "name" => "Vinyl" } ],
        "basic_information" => {
          "artist" => "Miles Davis",
          "title" => "Kind of Blue",
          "genres" => [ "Jazz" ],
          "styles" => [ "Modal" ],
          "labels" => [ { "name" => "Columbia" } ]
        }
      }
    }
  end

  it "returns only new or materially changed listing ids for enrichment" do
    unchanged = create(:listing, store:, discogs_listing_id: "1", discogs_release_id: "r1", price: "12.50", condition: "VG+", format: "Vinyl", notes: nil)
    changed = create(:listing, store:, discogs_listing_id: "2", discogs_release_id: "r2", price: "12.50", condition: "VG+", format: "Vinyl", notes: nil)

    result = described_class.new(store:, fetched_listings: [
      listing_payload(id: "1", release_id: "r1"),
      listing_payload(id: "2", release_id: "r2", price: "15.00"),
      listing_payload(id: "3", release_id: "r3")
    ]).call

    expect(result.listing_ids_for_enrichment).to contain_exactly(changed.id, store.listings.find_by!(discogs_listing_id: "3").id)
    expect(unchanged.reload.price.to_s).to eq("12.5")
    expect(changed.reload.price.to_s).to eq("15.0")
  end

  it "dedupes listings that appear in both public crawl directions" do
    described_class.new(store:, fetched_listings: [
      listing_payload(id: "1", release_id: "r1"),
      listing_payload(id: "1", release_id: "r1")
    ]).call

    expect(store.listings.where(discogs_listing_id: "1").count).to eq(1)
  end
end
