require "rails_helper"

RSpec.describe SyncStrategies::PublicApi do
  subject(:strategy) { described_class.new(client:, normalizer:) }

  let(:store) { create(:store, discogs_username: "teststore") }
  let(:client) { instance_double(DiscogsClient) }
  let(:normalizer) { instance_double(StoreSync::ListingNormalizer) }

  def api_page(listings:, pages: 1, current_page: 1)
    { "listings" => listings, "pagination" => { "pages" => pages, "page" => current_page } }
  end

  def raw_listing(id: "1")
    { "id" => id, "condition" => "VG+", "price" => { "value" => "10.00" }, "release" => { "format" => "Vinyl" } }
  end

  describe "#call" do
    it "returns normalized listings from desc and asc passes" do
      # Use >100 pages to trigger two-pass (Discogs API page limit)
      page_count = 101
      empty_page = api_page(listings: [], pages: page_count)
      # Generic stub: any page returns empty (covers pages 2-101 for both sort orders)
      allow(client).to receive(:seller_inventory).and_return(empty_page)
      # Override page 1 for each sort order with actual listings
      allow(client).to receive(:seller_inventory)
        .with("teststore", page: 1, sort_order: "desc")
        .and_return(api_page(listings: [ raw_listing(id: "1"), raw_listing(id: "2") ], pages: page_count))
      allow(client).to receive(:seller_inventory)
        .with("teststore", page: 1, sort_order: "asc")
        .and_return(api_page(listings: [ raw_listing(id: "3") ], pages: page_count))

      allow(normalizer).to receive(:call) { |raw, store_id:|
        { discogs_listing_id: raw["id"], store_id: }
      }

      result = strategy.call(store)

      expect(result).to be_a(SyncStrategies::Result)
      expect(result.listings).to contain_exactly(
        { discogs_listing_id: "1", store_id: store.id },
        { discogs_listing_id: "2", store_id: store.id },
        { discogs_listing_id: "3", store_id: store.id }
      )
      expect(result.complete?).to be false
    end

    it "filters out nil normalizations" do
      allow(client).to receive(:seller_inventory)
        .with("teststore", page: 1, sort_order: "desc")
        .and_return(api_page(listings: [ raw_listing(id: "1") ], pages: 1))
      allow(client).to receive(:seller_inventory)
        .with("teststore", page: 1, sort_order: "asc")
        .and_return(api_page(listings: []))

      allow(normalizer).to receive(:call).and_return(nil)

      result = strategy.call(store)

      expect(result.listings).to be_empty
      expect(result.complete?).to be true
    end

    it "returns empty result when inventory is empty" do
      allow(client).to receive(:seller_inventory)
        .with("teststore", page: 1, sort_order: "desc")
        .and_return(api_page(listings: []))
      allow(client).to receive(:seller_inventory)
        .with("teststore", page: 1, sort_order: "asc")
        .and_return(api_page(listings: []))

      result = strategy.call(store)

      expect(result.listings).to be_empty
      expect(result.complete?).to be true
    end

    it "propagates API errors" do
      allow(client).to receive(:seller_inventory)
        .and_raise(DiscogsClient::ApiError, "API error")

      expect { strategy.call(store) }.to raise_error(DiscogsClient::ApiError)
    end

    context "with max_pages" do
      it "limits pages in both passes" do
        allow(client).to receive(:seller_inventory)
          .with("teststore", page: 1, sort_order: "desc")
          .and_return(api_page(listings: [ raw_listing(id: "1") ], pages: 10))
        allow(client).to receive(:seller_inventory)
          .with("teststore", page: 1, sort_order: "asc")
          .and_return(api_page(listings: [], pages: 10))
        allow(normalizer).to receive(:call) { |raw, store_id:|
          { discogs_listing_id: raw["id"], store_id: }
        }

        result = strategy.call(store, max_pages: 1)

        expect(result.listings.size).to eq(1)
      end
    end

    context "with default dependencies" do
      subject(:strategy) { described_class.new }

      it "uses DiscogsClient and ListingNormalizer defaults" do
        # Verifies defaults don't raise at construction
        expect { strategy }.not_to raise_error
      end
    end
  end
end
