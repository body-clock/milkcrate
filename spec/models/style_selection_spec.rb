# frozen_string_literal: true

require "rails_helper"

RSpec.describe StyleSelection do
  def listing(styles:)
    instance_double(Listing, styles:)
  end

  def listings(count, styles:)
    Array.new(count) { listing(styles:) }
  end

  # Helper: build 599 listings with a realistic narrow-store distribution.
  # Returns [listings_array, selection].
  def build_issue_fixture(counts)
    all = counts.flat_map { |style, count| listings(count, styles: [ style ]) }
    # For listings that should carry multiple styles (overlap), we rebuild
    # them below in specific tests.
    [all, described_class.new(all)]
  end

  describe "#support" do
    it "deduplicates styles within each listing" do
      l = listing(styles: %w[Punk Punk Hardcore])
      sel = described_class.new([ l ])

      expect(sel.support).to eq("Punk" => 1, "Hardcore" => 1)
    end

    it "skips nil and empty style arrays" do
      a = listing(styles: nil)
      b = listing(styles: [])
      sel = described_class.new([ a, b ])

      expect(sel.support).to eq({})
    end

    it "excludes compacted nils within style arrays" do
      a = listing(styles: [ "Punk", nil, "Hardcore" ])
      sel = described_class.new([ a ])

      expect(sel.support).to eq("Punk" => 1, "Hardcore" => 1)
    end
  end

  describe "#main_styles" do
    it "classifies styles at or above 5% of eligible listings as main" do
      all = listings(75, styles: %w[Punk]) +
            listings(5, styles: %w[Hardcore]) +
            listings(3, styles: %w[Crust])

      sel = described_class.new(all)

      # 83 total. Main threshold = ceil(83 * 0.05) = ceil(4.15) = 5.
      # Punk 75 ≥ 5 → main. Hardcore 5 ≥ 5 AND ≥ 4 → main. Crust 3 < 4 → not even rotation floor.
      expect(sel.main_styles).to include("Punk", "Hardcore")
      expect(sel.main_styles).not_to include("Crust")
    end

    it "treats exactly 5% as main (boundary)" do
      # 20 listings total: 5% = 1. Punk at 1 meets floor (MIN_RECORDS=4)?
      # MIN_RECORDS = 4, so need at least 4. Let me use 80 listings total.
      # 5% of 80 = 4. So 4 listings out of 80 = exactly 5%.
      all = listings(4, styles: %w[Punk]) +
            listings(76, styles: %w[Other])

      sel = described_class.new(all)

      expect(sel.main_styles).to include("Punk")
    end

    it "excludes one record below 5% from main (boundary)" do
      # 81 listings total: 5% = 4.05 → .to_i = 4. 3 Punk listings.
      # 3 < 4 (MIN_RECORDS) → not even rotation floor. Need at least 4.
      # Let me use: 5% of 100 = 5. 4 < 5, so not main. But 4 ≥ rotation floor.
      all = listings(4, styles: %w[Punk]) +
            listings(96, styles: %w[Other])

      sel = described_class.new(all)

      expect(sel.main_styles).not_to include("Punk")
    end

    it "excludes suppressed broad styles from main" do
      # Create a scenario where Pop Rock is suppressed.
      # Pop Rock needs: ≥ 75% overlap with qualifying non-broad styles.
      # Let me use 100 listings: 20 Pop Rock, 20 Punk, 60 Other.
      # Pop Rock count 20 ≥ 4 (MIN_RECORDS) and 20 ≥ 5 (5% of 100).
      # Qualifying non-broad: Punk at 20, Other at 60 (both ≥ rotation threshold).
      # Pop Rock overlap: we need 75% of its 20 listings to also carry Punk or Other.
      # Build: 15 listings have both Pop Rock and Punk, 5 have only Pop Rock.
      # Overlap = 15/20 = 75% ≥ SUPPRESSION_RATIO → suppressed.
      pop_punk = Array.new(15) { listing(styles: %w[Pop\ Rock Punk]) }
      pop_only = listings(5, styles: %w[Pop\ Rock])
      punk_only = listings(5, styles: %w[Punk])
      other = listings(75, styles: %w[Other])

      sel = described_class.new(pop_punk + pop_only + punk_only + other)

      expect(sel.main_styles).not_to include("Pop Rock")
      expect(sel.main_styles).to include("Punk", "Other")
    end

    it "keeps broad style as main when overlap is below 75%" do
      # 14 overlap out of 20 = 70% < 75% → not suppressed.
      pop_punk = Array.new(14) { listing(styles: %w[Pop\ Rock Punk]) }
      pop_only = listings(6, styles: %w[Pop\ Rock])
      punk_only = listings(6, styles: %w[Punk])
      other = listings(74, styles: %w[Other])

      sel = described_class.new(pop_punk + pop_only + punk_only + other)

      expect(sel.main_styles).to include("Pop Rock")
      expect(sel.main_styles).to include("Punk")
    end
  end

  describe "broad-only store" do
    it "retains broad labels when no qualifying non-broad styles exist" do
      # Store has only Classic Rock and Hard Rock — no non-broad qualifying styles.
      # suppression check: qualifying_non_broad_styles.empty? → no suppression.
      all = listings(30, styles: %w[Classic\ Rock]) +
            listings(30, styles: %w[Hard\ Rock])

      sel = described_class.new(all)

      expect(sel.main_styles).to include("Classic Rock", "Hard Rock")
      expect(sel.rotation_styles).to be_empty
    end
  end

  describe "#rotation_styles" do
    it "classifies non-main styles at or above 1% as rotation" do
      # 200 listings total: 5% = 10, 1% = 2.
      # But MIN_RECORDS floor = 4, so rotation needs count ≥ 4 AND ≥ 2.
      all = listings(15, styles: %w[Punk]) +
            listings(15, styles: %w[Hardcore]) +
            listings(6, styles: %w[Oi]) +
            listings(3, styles: %w[Noise]) +
            listings(161, styles: %w[Other])

      sel = described_class.new(all)

      # Punk 15, Hardcore 15 ≥ 10 → main
      # Oi 6: not main (6 < 10), 6 ≥ rotation threshold (2), 6 ≥ MIN_RECORDS (4) → rotation
      # Noise 3: not main, 3 ≥ 2, but 3 < MIN_RECORDS → omitted
      expect(sel.rotation_styles).to include("Oi")
      expect(sel.rotation_styles).not_to include("Noise")
    end

    it "excludes suppressed broad styles from rotation" do
      # Pop Rock at count 10 with 80% overlap → suppressed.
      pop_punk = Array.new(8) { listing(styles: %w[Pop\ Rock Punk]) }
      pop_only = listings(2, styles: %w[Pop\ Rock])
      punk_only = listings(15, styles: %w[Punk])
      other = listings(75, styles: %w[Other])

      sel = described_class.new(pop_punk + pop_only + punk_only + other)

      expect(sel.rotation_styles).not_to include("Pop Rock")
    end
  end

  describe "#overlap_risk" do
    it "computes the share of a style's listings that also carry higher-support main styles" do
      # Punk 15, Hardcore 10, Crust 6 (all main).
      # Crust: 4 of its 6 also have Hardcore → overlap_risk = 4/6 ≈ 0.667
      # Punk: no higher-support main → not present in overlap_risk
      punk = listings(15, styles: %w[Punk])
      hardcore = listings(10, styles: %w[Hardcore])
      crust = (1..4).map { listing(styles: %w[Crust Hardcore]) } +
              (1..2).map { listing(styles: %w[Crust]) }
      other = listings(69, styles: %w[Other])

      sel = described_class.new(punk + hardcore + crust + other)

      # Main styles sorted by support: Punk (15), Other (69? wait...)
      # Actually total listings: 15 + 10 + 6 + 69 = 100
      # 5% threshold = 5. So main: Punk (15), Other (69), Hardcore (10), Crust (6)
      # Higher-support for Hardcore: Punk, Other
      # Higher-support for Crust: Punk, Other, Hardcore
      # Crust 6, 4 of them have Hardcore → overlap_risk["Crust"] == 4.0/6
      expect(sel.overlap_risk["Crust"]).to be_within(0.01).of(4.0 / 6)
    end

    it "returns zero risk for styles with no higher-support main styles" do
      all = listings(50, styles: %w[Punk]) +
            listings(50, styles: %w[Metal])

      sel = described_class.new(all)

      # Both main, but one has to come first by support. Metal at 50, Punk at 50 → tie, alpha decides.
      # "Metal" < "Punk" alphabetically, so Metal is first in the sorted-by-support list.
      # Punk has Metal as higher → some overlap?
      # Actually they have completely separate listings, so overlap_risk["Punk"] = 0
      expect(sel.overlap_risk["Punk"]).to eq(0)
    end
  end

  describe "#allocation_order" do
    it "places highest-overlap-risk styles first, then lowest support, then name" do
      # Three main styles: Punk (20, no overlap), Hardcore (15, some overlap with Punk),
      # Crust (10, high overlap with Hardcore).
      # Overlap risk: Crust > Hardcore > Punk(=0).
      # So allocation order: Crust, Hardcore, Punk.
      punk_listings = listings(20, styles: %w[Punk])
      hc_listings = listings(15, styles: %w[Hardcore])
      # Crust: 8 also Hardcore, 2 alone
      crust_listings = Array.new(8) { listing(styles: %w[Crust Hardcore]) } +
                       listings(2, styles: %w[Crust])
      # Hardcore: 5 also Punk
      hc_punk = Array.new(5) { listing(styles: %w[Hardcore Punk]) }
      hc_only = listings(10, styles: %w[Hardcore])
      other = listings(40, styles: %w[Other])

      sel = described_class.new(
        punk_listings + hc_punk + hc_only + crust_listings + other
      )

      # Main styles (all >= 5% of total = 5% of ~90):
      # Punk: 20 + 5 = 25, Hardcore: 5 + 10 + 8 = 23, Crust: 10, Other: 40
      # Overlap risk for Crust: 8/10 = 0.8 (with Hardcore)
      # Overlap risk for Hardcore: 5/23 ≈ 0.22 (with Punk, which is higher support)
      # Overlap risk for Punk: 0 (no higher-support main)
      # Allocation order: Crust (risk 0.8), Hardcore (risk 0.22), Punk (risk 0)
      expect(sel.allocation_order).to eq(%w[Crust Hardcore Punk Other])
    end
  end

  describe "#display_order" do
    it "sorts by support descending then name" do
      all = listings(20, styles: %w[Punk]) +
            listings(30, styles: %w[Metal]) +
            listings(20, styles: %w[Hardcore]) +
            listings(30, styles: %w[Other])

      sel = described_class.new(all)

      # Metal (30), Other (30), Hardcore (20), Punk (20)
      # Alphabetical for ties: "Hardcore" < "Punk", "Metal" < "Other"
      expect(sel.display_order).to eq(%w[Metal Other Hardcore Punk])
    end
  end

  describe "#main_counts" do
    it "returns counts only for main styles" do
      all = listings(20, styles: %w[Punk]) +
            listings(5, styles: %w[Crust]) +
            listings(75, styles: %w[Other])

      sel = described_class.new(all)

      # total = 100, main threshold = 5
      # Punk 20 ≥ 5 → main, Crust 5 ≥ 5 AND ≥ 4 → main, Other 75 → main
      expect(sel.main_counts).to include("Punk" => 20, "Crust" => 5, "Other" => 75)
      expect(sel.main_counts.keys).to match_array(%w[Crust Other Punk])
    end
  end

  describe "issue example distribution" do
    it "produces the expected tier boundaries for the 599-listing issue store" do
      # Construct 599 listings matching the issue's style distribution.
      # Desired style counts (some listings carry multiple styles):
      #   Punk 367, Hardcore 262, Crust 39, Black Metal 38,
      #   Death Metal 38, Grindcore 36, Oi 13, Noise 8.
      # Main threshold: ceil(599 * 0.05) = 30.
      # Rotation threshold: ceil(599 * 0.01) = 6.

      # Overlap construction:
      #   h_punk_hc    = 163 (Punk + Hardcore)
      #   punk_only    = 204 (Punk only)
      #   hc_only      = 60  (Hardcore only)
      #   crust_hc     = 39  (Crust + Hardcore)
      #   bm_only      = 38  (Black Metal)
      #   dm_only      = 38  (Death Metal)
      #   grind_only   = 36  (Grindcore)
      #   oi_only      = 13  (Oi)
      #   noise_only   = 8   (Noise)
      # Total = 599, Punk = 367, Hardcore = 262 ✓

      all = []
      all += Array.new(163) { listing(styles: %w[Punk Hardcore]) }
      all += Array.new(204) { listing(styles: %w[Punk]) }
      all += Array.new(60)  { listing(styles: %w[Hardcore]) }
      all += Array.new(39)  { listing(styles: %w[Crust Hardcore]) }
      all += Array.new(38)  { listing(styles: %w[Black\ Metal]) }
      all += Array.new(38)  { listing(styles: %w[Death\ Metal]) }
      all += Array.new(36)  { listing(styles: %w[Grindcore]) }
      all += Array.new(13)  { listing(styles: %w[Oi]) }
      all += Array.new(8)   { listing(styles: %w[Noise]) }

      sel = described_class.new(all)

      expect(sel.total_listings).to eq(599)

      # All 6 core styles ≥ 30 → main
      expect(sel.main_styles).to include(
        "Punk", "Hardcore", "Crust", "Black Metal", "Death Metal", "Grindcore"
      )

      # Rotation tier: Oi 13 ≥ 6, Noise 8 ≥ 6
      expect(sel.rotation_styles).to include("Oi", "Noise")
    end
  end

  describe "deterministic tie-breaking" do
    it "breaks support ties alphabetically" do
      all = listings(20, styles: %w[Metal]) +
            listings(20, styles: %w[Punk]) +
            listings(60, styles: %w[Other])

      sel = described_class.new(all)

      expect(sel.display_order).to eq(%w[Other Metal Punk])
    end

    it "breaks overlap-risk ties with support then name" do
      # Need two styles with same overlap-risk. Both with risk 0.
      punk = listings(15, styles: %w[Punk])
      hc = listings(10, styles: %w[Hardcore])
      other = listings(75, styles: %w[Other])

      sel = described_class.new(punk + hc + other)

      # Allocation order: lowest support first when risk is tied.
      # Hardcore (10) before Punk (15)
      expect(sel.allocation_order).to eq(%w[Hardcore Punk Other])
    end
  end
end
