require "rails_helper"

RSpec.describe SeoHelper, type: :helper do
  let(:store) { create(:store, name: "Test Store", discogs_username: "teststore") }

  def create_listings(genres_by_count)
    genres_by_count.each do |genre, count|
      count.times { create(:listing, store: store, genres: [ genre ]) }
    end
  end

  describe "#seo_title" do
    it "uses genre-specific title for narrow stores" do
      create_listings("Techno" => 80, "House" => 10, "Electronic" => 10)

      title = helper.seo_title(store)

      expected = I18n.t("pages.seo.store.narrow_title", store_name: "Test Store", genre: "Techno")
      expect(title).to eq(expected)
    end

    it "uses broad title for distributed-genre stores" do
      create_listings("Electronic" => 35, "Rock" => 35, "Jazz" => 30)

      title = helper.seo_title(store)

      expected = I18n.t("pages.seo.store.broad_title", store_name: "Test Store")
      expect(title).to eq(expected)
    end

    it "uses broad title when store has no listings" do
      title = helper.seo_title(store)

      expect(title).to eq("Test Store Vinyl Records — Browse on Milkcrate")
    end
  end

  describe "#seo_description" do
    it "references dominant genre for narrow stores" do
      create_listings("Techno" => 80, "House" => 10, "Electronic" => 10)

      desc = helper.seo_description(store)

      expect(desc).to include("techno")
    end

    it "lists top genres for broad stores" do
      create_listings("Electronic" => 35, "Rock" => 35, "Jazz" => 30)

      desc = helper.seo_description(store)

      expected_genres = I18n.t("pages.seo.store.broad_description",
        store_name: "Test Store", count: "100", genres: "Electronic, Rock, Jazz")
      expect(desc).to eq(expected_genres)
    end

    it "appends Philadelphia location for Philly-based stores" do
      store.update_column(:location, "Philadelphia, PA")
      create_listings("Techno" => 3)

      desc = helper.seo_description(store)

      expect(desc).to include(I18n.t("pages.seo.store.philly_suffix").strip)
    end

    it "does not append Philadelphia for non-Philly stores" do
      store.update_column(:location, "New York, NY")
      create_listings("Techno" => 3)

      desc = helper.seo_description(store)

      expect(desc).not_to include("Philadelphia-based")
    end
  end

  describe "#seo_store_json_ld" do
    it "includes LocalBusiness schema with keywords" do
      create_listings("Techno" => 10, "House" => 5)

      json_ld = helper.seo_store_json_ld(store)

      expect(json_ld).to include('"@type":"LocalBusiness"')
      expect(json_ld).to include('"@type":"AggregateOffer"')
    end

    it "includes store name and URL" do
      create(:listing, store: store, genres: [ "Techno" ])

      json_ld = helper.seo_store_json_ld(store)

      expect(json_ld).to include('"Test Store"')
      expect(json_ld).to include("/teststore")
    end
  end

  describe "#seo_home_json_ld" do
    it "returns Organization schema" do
      json_ld = helper.seo_home_json_ld

      expect(json_ld).to include('"@type":"Organization"')
      expect(json_ld).to include('"Milkcrate"')
    end
  end

  describe "#seo_explore_json_ld" do
    it "returns ItemList with store entries" do
      stores = [
        { name: "Alpha", discogs_username: "alpha" },
        { name: "Beta", discogs_username: "beta" }
      ]

      json_ld = helper.seo_explore_json_ld(stores)

      expect(json_ld).to include('"@type":"ItemList"')
      expect(json_ld).to include('"Alpha"')
      expect(json_ld).to include('"Beta"')
    end

    it "returns empty ItemList for no stores" do
      json_ld = helper.seo_explore_json_ld([])

      expect(json_ld).to include('"@type":"ItemList"')
      expect(json_ld).to include('"itemListElement":[]')
    end
  end

  describe "#default_og_image" do
    it "returns the SVG icon URL" do
      expect(helper.default_og_image).to end_with("/icon.svg")
    end
  end
end
