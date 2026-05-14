require "rails_helper"

RSpec.describe MarketingPreviewPresenter do
  let(:discogs_username) { Settings.discogs_username }

  describe "#preview_data" do
    context "when the demo store exists with eligible listings" do
      let!(:store) do
        create(:store,
          discogs_username: discogs_username,
          name: "Philadelphia Music"
        )
      end

      before do
        # Create enough listings across genres to generate picks + featured + genre crates.
        # Each listing needs a primary_genre to feed the strategy scoring engine.
        # StorefrontCuration#eligible_listings uses lp_only — format must include LP or Album.
        create_list(:listing, 30, store: store,
          artist: "Jazz Artist",
          title: "Jazz Record",
          genres: [ "Jazz" ],
          format: "LP, Album")
        create_list(:listing, 30, store: store,
          artist: "Rock Artist",
          title: "Rock Record",
          genres: [ "Rock" ],
          format: "LP, Album")
      end

      it "returns a hash with store_name, store_slug, and sections" do
        result = described_class.new.preview_data

        expect(result).to be_a(Hash)
        expect(result.keys).to match_array(%i[store_name store_slug sections])
        expect(result[:store_name]).to eq("Philadelphia Music")
        expect(result[:store_slug]).to eq(discogs_username)
      end

      it "includes bounded sections with recognized keys" do
        result = described_class.new.preview_data

        expect(result[:sections]).to be_an(Array)
        section_keys = result[:sections].map { |s| s[:key] }
        # picks_wall is always present when store has listings
        expect(section_keys).to include("picks_wall")
      end

      it "caps records per crate to at most MAX_PREVIEW_RECORDS" do
        result = described_class.new.preview_data

        result[:sections].each do |section|
          crates = section[:crate] ? [ section[:crate] ] : section[:crates]
          crates.each do |crate|
            expect(crate[:records].size).to be <= described_class::MAX_PREVIEW_RECORDS
            expect(crate[:count]).to eq(crate[:records].size)
          end
        end
      end

      it "caps featured crates to at most MAX_FEATURED_CRATES" do
        result = described_class.new.preview_data

        featured_section = result[:sections].find { |s| s[:key] == "featured_crates" }
        if featured_section
          expect(featured_section[:crates].size).to be <= described_class::MAX_FEATURED_CRATES
        end
      end

      it "caps genre crates to at most MAX_GENRE_CRATES" do
        result = described_class.new.preview_data

        genre_section = result[:sections].find { |s| s[:key] == "genre_grid" }
        if genre_section
          expect(genre_section[:crates].size).to be <= described_class::MAX_GENRE_CRATES
        end
      end
    end

    context "when the demo store exists but has no listings" do
      let!(:store) do
        create(:store,
          discogs_username: discogs_username,
          name: "Empty Store"
        )
      end

      it "returns empty sections without raising" do
        result = described_class.new.preview_data

        expect(result[:store_name]).to eq("Empty Store")
        expect(result[:store_slug]).to eq(discogs_username)
        expect(result[:sections]).to eq([])
      end
    end

    context "when no demo store exists" do
      it "returns fallback preview data without raising" do
        # The test DB has no store matching Settings.discogs_username
        result = described_class.new.preview_data

        expect(result).to be_a(Hash)
        expect(result.keys).to match_array(%i[store_name store_slug sections])
        expect(result[:store_slug]).to be_nil
        expect(result[:sections]).to eq([])
      end

      it "fallback includes a placeholder store name" do
        result = described_class.new.preview_data

        expect(result[:store_name]).to be_a(String)
        expect(result[:store_name]).not_to be_empty
      end
    end

    context "preview data shape matches expected frontend contract" do
      let!(:store) do
        create(:store,
          discogs_username: discogs_username,
          name: "Philadelphia Music"
        )
      end

      before do
        create_list(:listing, 20, store: store,
          artist: "Jazz Artist",
          title: "Jazz Record",
          genres: [ "Jazz" ],
          format: "LP, Album")
      end

      it "produces sections where crates have expected keys" do
        result = described_class.new.preview_data

        result[:sections].each do |section|
          expect(section.keys).to match_array(%i[key crate]) if section[:crate]
          if section[:crates]
            expect(section.keys).to match_array(%i[key crates])
            section[:crates].each do |crate|
              expect(crate.keys).to include(:slug, :name, :count, :records)
            end
          end
          if section[:crate]
            expect(section[:crate].keys).to include(:slug, :name, :count, :records)
          end
        end
      end

      it "produces records with expected listing fields" do
        result = described_class.new.preview_data

        result[:sections].each do |section|
          crates = section[:crate] ? [ section[:crate] ] : (section[:crates] || [])
          crates.each do |crate|
            crate[:records].each do |record|
              expect(record.keys).to include(:id, :artist, :title, :cover_image_url, :discogs_url)
            end
          end
        end
      end
    end
  end
end
