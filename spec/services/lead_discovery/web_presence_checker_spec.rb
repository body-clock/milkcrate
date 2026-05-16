require "rails_helper"

RSpec.describe LeadDiscovery::WebPresenceChecker do
  subject(:checker) { described_class.new(http_client: http_client) }

  let(:http_client) { instance_double(Faraday::Connection) }

  let(:lead_no_presence) do
    instance_double(Lead,
      discogs_username: "analog_attic",
      store_name: "Analog Attic",
      discogs_profile: { "name" => "Analog Attic", "profile" => "Record seller in Brooklyn", "location" => "Brooklyn, NY" }
    )
  end

  let(:lead_with_social) do
    instance_double(Lead,
      discogs_username: "jazz_vendor",
      store_name: "Jazz Vendor Records",
      discogs_profile: {
        "name" => "Jazz Vendor Records",
        "profile" => "Selling jazz since '96. Find us on Instagram: https://instagram.com/jazzvendor",
        "location" => "Portland, OR"
      }
    )
  end

  let(:lead_with_ecommerce_url) do
    instance_double(Lead,
      discogs_username: "shop_seller",
      store_name: "Shop Seller",
      discogs_profile: {
        "name" => "Shop Seller",
        "profile" => "Visit our store at https://shopseller.myshopify.com",
        "location" => "Austin, TX"
      }
    )
  end

  def stub_domain(url, status: 200)
    response = instance_double(Faraday::Response, status: status)
    allow(http_client).to receive(:get).with(url, nil, nil).and_return(response)
  end

  def stub_domain_unreachable(url)
    allow(http_client).to receive(:get).with(url, nil, nil)
      .and_raise(Faraday::ConnectionFailed.new("connection refused"))
  end

  # Stub all platform lookups to be unreachable by default, then override specific ones.
  def stub_all_platforms(slug)
    described_class::ECOMMERCE_PLATFORMS.each_value do |domain_builder|
      domain_builder.call(slug).each do |domain|
        stub_domain_unreachable("https://#{domain}")
      end
    end
  end

  describe "#check" do
    context "when seller has no web presence" do
      before { stub_all_platforms("analog-attic") }

      it "classifies as no_presence" do
        result = checker.check(lead_no_presence)
        expect(result.classified_as).to eq("no_presence")
        expect(result.notes).to include("No public web presence found")
        expect(result.listed_urls).to be_empty
      end
    end

    context "when seller has Instagram in Discogs profile" do
      before { stub_all_platforms("jazz-vendor-records") }

      it "classifies as social_media" do
        result = checker.check(lead_with_social)
        expect(result.classified_as).to eq("social_media")
        expect(result.listed_urls).to include("https://instagram.com/jazzvendor")
        expect(result.notes).to include("Social media presence found")
      end
    end

    context "when seller has a Shopify store reachable" do
      before do
        stub_all_platforms("shop-seller")
        stub_domain("https://shop-seller.myshopify.com", status: 200)
      end

      it "classifies as standalone_ecommerce" do
        result = checker.check(lead_with_ecommerce_url)
        expect(result.classified_as).to eq("standalone_ecommerce")
        expect(result.platforms["shopify"]).to eq("https://shop-seller.myshopify.com")
        expect(result.notes).to include("Standalone ecommerce found")
      end
    end

    context "when Shopify URL is in Discogs profile" do
      let(:lead_with_referenced_ecommerce) do
        instance_double(Lead,
          discogs_username: "shop_seller",
          store_name: "Shop Seller",
          discogs_profile: {
            "name" => "Shop Seller",
            "profile" => "Also at https://shopseller.bigcartel.com",
            "location" => "Austin, TX"
          }
        )
      end

      before { stub_all_platforms("shop-seller") }

      it "classifies as standalone_ecommerce from profile URL" do
        result = checker.check(lead_with_referenced_ecommerce)
        expect(result.classified_as).to eq("standalone_ecommerce")
        expect(result.listed_urls).to include("https://shopseller.bigcartel.com")
      end
    end

    context "with a lead that has no profile data" do
      let(:lead_no_profile) do
        instance_double(Lead,
          discogs_username: "empty_seller",
          store_name: "",
          discogs_profile: {}
        )
      end

      before { stub_all_platforms("empty-seller") }

      it "classifies as no_presence using username-derived slug" do
        result = checker.check(lead_no_profile)
        expect(result.classified_as).to eq("no_presence")
        expect(result.listed_urls).to be_empty
      end
    end

    context "when HTTP request times out" do
      before do
        allow(http_client).to receive(:get).and_raise(Faraday::TimeoutError, "timed out")
      end

      it "gracefully handles timeouts and continues" do
        result = checker.check(lead_no_presence)
        expect(result.platforms.values.compact).to be_empty
        expect(result.classified_as).to eq("no_presence")
      end
    end
  end

  describe "#check_and_store!" do
    let(:lead) { lead_no_presence }

    before do
      stub_all_platforms("analog-attic")
      allow(lead).to receive(:update!).and_return(true)
    end

    it "stores the result on the lead" do
      expect(lead).to receive(:update!).with(hash_including(web_presence: hash_including(classified_as: "no_presence")))
      checker.check_and_store!(lead)
    end
  end

  describe "#slugify" do
    it "converts a store name to a domain-safe slug" do
      slug = checker.send(:slugify, "Analog Attic Records")
      expect(slug).to eq("analog-attic-records")
    end

    it "handles special characters" do
      slug = checker.send(:slugify, "Mike's Record Shop!")
      expect(slug).to eq("mike-s-record-shop")
    end

    it "falls back to 'shop' for empty input" do
      slug = checker.send(:slugify, "")
      expect(slug).to eq("shop")
    end
  end
end
