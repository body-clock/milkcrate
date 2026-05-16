require "rails_helper"

RSpec.describe LeadDiscovery::SellerFinder do
  let(:client) { instance_double(DiscogsClient) }
  let(:finder) { described_class.new(client: client) }

  let(:sample_listing_with_vinyl) do
    {
      "id" => 1,
      "release" => { "id" => 123, "format" => "Vinyl", "genre" => "Jazz", "style" => ["Modal"] },
      "seller" => { "username" => "jazz_vendor" },
      "price" => 15.00
    }
  end

  let(:sample_listing_with_cd) do
    {
      "id" => 2,
      "release" => { "id" => 456, "format" => "CD", "genre" => "Jazz", "style" => ["Bop"] },
      "seller" => { "username" => "disc_cellar" },
      "price" => 8.00
    }
  end

  let(:sample_listing_lp) do
    {
      "id" => 3,
      "release" => { "id" => 789, "format" => "LP", "genre" => "Soul", "style" => ["Deep Funk"] },
      "seller" => { "username" => "jazz_vendor" },
      "price" => 25.00
    }
  end

  let(:search_page_one) do
    {
      "pagination" => { "pages" => 1, "page" => 1, "per_page" => 100 },
      "results" => [
        {
          "id" => 1,
          "type" => "listing",
          "seller" => { "username" => "jazz_vendor" },
          "genre" => ["Jazz"],
          "format" => ["Vinyl"]
        },
        {
          "id" => 2,
          "type" => "listing",
          "seller" => { "username" => "disc_cellar" },
          "genre" => ["Jazz"],
          "format" => ["CD"]
        }
      ]
    }
  end

  let(:profile_jazz_vendor) do
    { "name" => "Jazz Vendor Records", "profile" => "Selling jazz since '96",
      "location" => "Brooklyn, NY", "rank" => 5, "rating" => { "average" => 4.9 } }
  end

  let(:profile_disc_cellar) do
    { "name" => "Disc Cellar", "profile" => "CDs and more",
      "location" => "Portland, OR", "rank" => 3, "rating" => { "average" => 4.5 } }
  end

  before do
    # Stub rate limit header on DiscogsClient responses
    allow_any_instance_of(Faraday::Response).to receive(:headers)
      .and_return({ "x-discogs-ratelimit-remaining" => "50" })

    # Stub search results — the finder uses Faraday directly for the search endpoint
    allow_any_instance_of(Faraday::Connection).to receive(:get)
      .and_wrap_original do |original, *args|
        url = args.first
        if url.to_s.include?("/database/search")
          double(body: search_page_one, status: 200, headers: {})
        else
          original.call(*args)
        end
      end
  end

  describe "#find_candidates" do
    context "with a discoverable seller" do
      before do
        allow(client).to receive(:seller_profile).with("jazz_vendor").and_return(profile_jazz_vendor)
        allow(client).to receive(:seller_profile).with("disc_cellar").and_return(profile_disc_cellar)

        allow(client).to receive(:seller_inventory_pages).with("jazz_vendor").and_return(19)
        allow(client).to receive(:seller_inventory_pages).with("disc_cellar").and_return(2)

        # jazz_vendor inventory — mix of vinyl and non-vinyl
        allow(client).to receive(:seller_inventory)
          .with("jazz_vendor", page: 1)
          .and_return({ "listings" => [ sample_listing_with_vinyl, sample_listing_lp, sample_listing_with_cd ],
                        "pagination" => { "pages" => 19 } })
        allow(client).to receive(:seller_inventory)
          .with("jazz_vendor", page: 2)
          .and_return({ "listings" => [ sample_listing_with_vinyl, sample_listing_with_cd ],
                        "pagination" => { "pages" => 19 } })
        allow(client).to receive(:seller_inventory)
          .with("jazz_vendor", page: 3)
          .and_return({ "listings" => [ sample_listing_lp ],
                        "pagination" => { "pages" => 19 } })

        # disc_cellar inventory — mostly CDs, below 500 threshold
        allow(client).to receive(:seller_inventory)
          .with("disc_cellar", page: 1)
          .and_return({ "listings" => [ sample_listing_with_cd ],
                        "pagination" => { "pages" => 2 } })
        allow(client).to receive(:seller_inventory)
          .with("disc_cellar", page: 2)
          .and_return({ "listings" => [ sample_listing_with_cd ],
                        "pagination" => { "pages" => 2 } })
        allow(client).to receive(:seller_inventory)
          .with("disc_cellar", page: 3)
          .and_return({ "listings" => [], "pagination" => { "pages" => 2 } })
      end

      it "discovers sellers and returns candidates with metrics" do
        candidates = finder.find_candidates

        expect(candidates.size).to be >= 1

        jazz_vendor = candidates.find { |c| c.discogs_username == "jazz_vendor" }
        expect(jazz_vendor).not_to be_nil
        expect(jazz_vendor.store_name).to eq("Jazz Vendor Records")
        expect(jazz_vendor.inventory_size).to be > 500  # 19 pages * 100 >= 500
        expect(jazz_vendor.vinyl_count).to be > 0
        expect(jazz_vendor.vinyl_percentage).to be > 50.0
        expect(jazz_vendor.genres).to include("Jazz", "Soul")
        expect(jazz_vendor.styles).to include("Modal", "Deep Funk")
      end

      it "includes sellers with inventory >= 1 (lower-confidence tier kept for scoring)" do
        candidates = finder.find_candidates
        disc_cellar = candidates.find { |c| c.discogs_username == "disc_cellar" }
        expect(disc_cellar).not_to be_nil
        expect(disc_cellar.inventory_size).to eq(200)
      end
    end

    context "when seller already exists as a Store" do
      let!(:existing_store) { create(:store, discogs_username: "jazz_vendor") }

      before do
        allow(client).to receive(:seller_profile).and_return(profile_jazz_vendor)
        allow(client).to receive(:seller_inventory_pages).and_return(19)
        allow(client).to receive(:seller_inventory).and_return({ "listings" => [ sample_listing_with_vinyl ], "pagination" => { "pages" => 19 } })
      end

      it "skips sellers that already have a store" do
        candidates = finder.find_candidates
        jazz_vendor = candidates.find { |c| c.discogs_username == "jazz_vendor" }
        expect(jazz_vendor).to be_nil
        # Non-store sellers are still discovered
        expect(candidates).not_to be_empty
      end
    end

    context "when seller already exists as a dismissed Lead" do
      let!(:existing_lead) { create(:lead, discogs_username: "jazz_vendor", status: :dismissed) }

      before do
        allow(client).to receive(:seller_profile).and_return(profile_jazz_vendor)
        allow(client).to receive(:seller_inventory_pages).and_return(19)
        allow(client).to receive(:seller_inventory).and_return({ "listings" => [ sample_listing_with_vinyl ], "pagination" => { "pages" => 19 } })
      end

      it "skips dismissed leads" do
        candidates = finder.find_candidates
        jazz_vendor = candidates.find { |c| c.discogs_username == "jazz_vendor" }
        expect(jazz_vendor).to be_nil
        # Non-dismissed sellers still come through
        expect(candidates).not_to be_empty
      end
    end

    context "when seller already exists as a pending Lead" do
      let!(:existing_lead) { create(:lead, discogs_username: "jazz_vendor", status: :pending) }

      before do
        allow(client).to receive(:seller_profile).and_return(profile_jazz_vendor)
        allow(client).to receive(:seller_inventory_pages).and_return(19)
        allow(client).to receive(:seller_inventory).and_return({ "listings" => [ sample_listing_with_vinyl ], "pagination" => { "pages" => 19 } })
      end

      it "returns candidates for pending leads (they get updated)" do
        candidates = finder.find_candidates
        expect(candidates.map(&:discogs_username)).to include("jazz_vendor")
      end
    end

    context "with a seller outside inventory range" do
      before do
        allow(client).to receive(:seller_profile).and_return(profile_jazz_vendor)
        allow(client).to receive(:seller_inventory_pages).and_return(60)  # 6000 listings — above max
        allow(client).to receive(:seller_inventory).and_return({ "listings" => [ sample_listing_with_vinyl ], "pagination" => { "pages" => 60 } })
      end

      it "excludes sellers over 5000 listings" do
        candidates = finder.find_candidates
        expect(candidates).to be_empty
      end
    end

    context "with API errors" do
      before do
        allow(client).to receive(:seller_profile).and_return(profile_jazz_vendor)
        allow(client).to receive(:seller_inventory_pages).and_return(19)
        allow(client).to receive(:seller_inventory).and_raise(DiscogsClient::ApiError, "API error")
      end

      it "logs and skips sellers that error" do
        expect(Rails.logger).to receive(:warn).with(/API error/).at_least(:once)
        candidates = finder.find_candidates
        expect(candidates).to be_empty
      end
    end
  end
end
