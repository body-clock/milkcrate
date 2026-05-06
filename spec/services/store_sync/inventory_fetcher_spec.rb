require "rails_helper"

RSpec.describe StoreSync::InventoryFetcher do
  let(:store) { create(:store, discogs_username: "teststore") }
  let(:client) { instance_double(DiscogsClient) }
  subject(:fetcher) { described_class.new(store, client: client) }

  def api_page(listings:, pages: 1, current_page: 1)
    { "listings" => listings, "pagination" => { "pages" => pages, "page" => current_page } }
  end

  def raw_listing(id: "1")
    { "id" => id, "condition" => "VG+", "price" => { "value" => "10.00" }, "release" => { "format" => "Vinyl" } }
  end

  describe "#fetch" do
    it "returns accumulated listings from paginated API responses" do
      allow(client).to receive(:seller_inventory).with("teststore", page: 1, sort_order: "desc").and_return(
        api_page(listings: [ raw_listing(id: "1") ], pages: 2)
      )
      allow(client).to receive(:seller_inventory).with("teststore", page: 2, sort_order: "desc").and_return(
        api_page(listings: [ raw_listing(id: "2") ])
      )

      result = fetcher.fetch

      expect(result.listings.size).to eq(2)
      expect(result.pages_fetched).to eq(2)
    end

    it "stops at max_pages" do
      allow(client).to receive(:seller_inventory).with("teststore", page: 1, sort_order: "desc").and_return(
        api_page(listings: [ raw_listing(id: "1") ], pages: 10)
      )

      result = fetcher.fetch(max_pages: 1)

      expect(result.listings.size).to eq(1)
      expect(result.pages_fetched).to eq(1)
    end

    it "returns empty result when API returns no listings" do
      allow(client).to receive(:seller_inventory).and_return(api_page(listings: []))

      result = fetcher.fetch

      expect(result.listings).to be_empty
      expect(result.pages_fetched).to eq(1)
    end

    it "handles Discogs 100-page limit gracefully" do
      allow(client).to receive(:seller_inventory).with("teststore", page: 1, sort_order: "desc").and_return(
        api_page(listings: [ raw_listing(id: "1") ], pages: 150)
      )
      allow(client).to receive(:seller_inventory).with("teststore", page: 2, sort_order: "desc").and_raise(
        DiscogsClient::ApiError, "Pagination above 100 pages is not supported"
      )

      result = fetcher.fetch

      expect(result.listings.size).to eq(1)
      expect(result.pages_fetched).to eq(2)
    end

    context "with custom sort_order" do
      it "passes sort_order to the API client" do
        allow(client).to receive(:seller_inventory).with("teststore", page: 1, sort_order: "asc").and_return(
          api_page(listings: [])
        )

        result = fetcher.fetch(sort_order: "asc")

        expect(result.listings).to be_empty
      end
    end
  end
end
