require "rails_helper"

RSpec.describe StorefrontTheme do
  describe ".style" do
    it "creates a theme that matches listings with the given style" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ])
      ]

      expect(theme.listings_for(listings).size).to eq(4)
    end

    it "excludes listings without the matching style" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Rock" ])
      ]

      expect(theme.listings_for(listings).size).to eq(1)
    end
  end

  describe ".genre" do
    it "creates a theme that matches listings with the given primary genre" do
      theme = described_class.genre("Jazz")
      listings = [
        build_listing(genres: [ "Jazz" ]),
        build_listing(genres: [ "Jazz" ]),
        build_listing(genres: [ "Jazz" ]),
        build_listing(genres: [ "Jazz" ])
      ]

      expect(theme.listings_for(listings).size).to eq(4)
    end

    it "excludes listings without the matching genre" do
      theme = described_class.genre("Jazz")
      listings = [
        build_listing(genres: [ "Jazz" ]),
        build_listing(genres: [ "Rock" ])
      ]

      expect(theme.listings_for(listings).size).to eq(1)
    end
  end

  describe "#eligible?" do
    it "returns true when pool has enough matching records" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ])
      ]

      expect(theme.eligible?(listings)).to be(true)
    end

    it "returns false when pool has too few matching records" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Jazz" ])
      ]

      expect(theme.eligible?(listings)).to be(false)
    end
  end

  describe "#listings_for" do
    it "returns matching records sorted by sort_key" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ], want_count: 100, have_count: 50, listed_at: 1.day.ago),
        build_listing(styles: [ "Jazz" ], want_count: 200, have_count: 100, listed_at: 2.days.ago),
        build_listing(styles: [ "Jazz" ], want_count: 50, have_count: 10, listed_at: 3.days.ago)
      ]

      result = theme.listings_for(listings)
      expect(result.first.want_count).to eq(200) # highest want_count first
      expect(result.last.want_count).to eq(50)   # lowest want_count last
    end

    it "excludes non-matching records" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ]),
        build_listing(styles: [ "Rock" ])
      ]

      expect(theme.listings_for(listings).size).to eq(1)
    end

    it "handles nil want/have counts gracefully" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ], want_count: nil, have_count: nil, listed_at: 1.day.ago)
      ]

      expect { theme.listings_for(listings) }.not_to raise_error
    end

    it "handles nil listed_at gracefully" do
      theme = described_class.style("Jazz")
      listings = [
        build_listing(styles: [ "Jazz" ], want_count: 10, have_count: 5, listed_at: nil, last_seen_at: Time.current)
      ]

      expect { theme.listings_for(listings) }.not_to raise_error
    end
  end
end
