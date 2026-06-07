require "rails_helper"

RSpec.describe StylesAxis do
  subject(:axis) { described_class.new }

  let(:listing) { instance_double(Listing, styles: [ "Punk", "Hardcore" ]) }

  describe "#key_for" do
    it "returns the listing's first style" do
      expect(axis.key_for(listing)).to eq("Punk")
    end
  end

  describe "#matches?" do
    it "is true when the listing's styles include the name" do
      expect(axis.matches?(listing, "Hardcore")).to be true
    end

    it "is false when the listing's styles do not include the name" do
      expect(axis.matches?(listing, "Bebop")).to be false
    end
  end

  describe "#tally_from" do
    it "counts listings by all their styles" do
      a = instance_double(Listing, styles: [ "Punk" ])
      b = instance_double(Listing, styles: [ "Punk", "Hardcore" ])
      c = instance_double(Listing, styles: [ "Hardcore" ])

      expect(axis.tally_from([ a, b, c ])).to eq("Punk" => 2, "Hardcore" => 2)
    end

    it "excludes listings with nil or empty styles" do
      a = instance_double(Listing, styles: nil)
      b = instance_double(Listing, styles: [])

      expect(axis.tally_from([ a, b ])).to eq({})
    end
  end

  describe "#main_counts" do
    it "returns only main-tier style counts" do
      punk   = instance_double(Listing, styles: [ "Punk" ])
      metal  = instance_double(Listing, styles: [ "Metal" ])
      others = 18.times.map { instance_double(Listing, styles: [ "Other" ]) }

      counts = axis.main_counts([ punk, metal ] + others)

      # 20 total: 5% ceil = 1, floor = 4. Punk 1 < 4 → omitted.
      # Metal 1 < 4 → omitted. Other 18 ≥ 4 → main.
      expect(counts).to include("Other" => 18)
      expect(counts).not_to have_key("Punk")
      expect(counts).not_to have_key("Metal")
    end

    it "excludes suppressed and omitted styles" do
      # Create a fixture where Pop Rock is suppressed by Punk overlap.
      punk_only   = 4.times.map { instance_double(Listing, styles: [ "Punk" ]) }
      pop_rock    = 4.times.map { instance_double(Listing, styles: [ "Pop Rock" ]) }
      other       = 92.times.map { instance_double(Listing, styles: [ "Other" ]) }

      counts = axis.main_counts(punk_only + pop_rock + other)

      # 100 total: main threshold = 5.
      # Punk 4 ≥ 4 but 4 < 5 → not main.
      # Pop Rock 4 ≥ 4 but 4 < 5 → not main.
      # Other 92 ≥ 5 → main.
      expect(counts).to eq("Other" => 92)
    end
  end

  describe "#allocation_order" do
    it "orders by overlap risk descending, support ascending, then name" do
      punk      = 4.times.map { instance_double(Listing, styles: [ "Punk", "Hardcore" ]) }
      hc_only   = 1.times.map { instance_double(Listing, styles: [ "Hardcore" ]) }
      other     = 95.times.map { instance_double(Listing, styles: [ "Other" ]) }

      order = axis.allocation_order(punk + hc_only + other)

      # Total 100. Main threshold = 5.
      # Punk 4 < 5 → not main.
      # Hardcore 4+1 = 5 ≥ 5 → main.
      # Other 95 ≥ 5 → main.
      # Hardcore 4/5 listings overlap with Punk (not main), so overlap risk = 0.
      # Allocation: no higher-support main for either → both risk 0.
      # Support: Other 95, Hardcore 5. Lower support first: Hardcore, then Other.
      expect(order).to eq(%w[Hardcore Other])
    end
  end

  describe "#display_order" do
    it "sorts main styles by support descending then name" do
      punk   = 6.times.map { instance_double(Listing, styles: [ "Punk" ]) }
      metal  = 10.times.map { instance_double(Listing, styles: [ "Metal" ]) }
      other  = 84.times.map { instance_double(Listing, styles: [ "Other" ]) }

      order = axis.display_order(punk + metal + other)

      # 100 total, main threshold = 5.
      # Punk 6, Metal 10, Other 84 → all main.
      # Display: Other(84), Metal(10), Punk(6).
      expect(order).to eq(%w[Other Metal Punk])
    end
  end

  describe "#thematic_candidates" do
    it "returns StorefrontTheme objects for rotation-tier styles only" do
      punk   = 6.times.map { instance_double(Listing, styles: [ "Punk" ]) }
      oi     = 4.times.map { instance_double(Listing, styles: [ "Oi" ]) }
      noise  = 3.times.map { instance_double(Listing, styles: [ "Noise" ]) }
      other  = 87.times.map { instance_double(Listing, styles: [ "Other" ]) }

      candidates = axis.thematic_candidates(punk + oi + noise + other)

      # 100 total, main threshold = 5, rotation threshold = 1.
      # Punk 6 ≥ 5 → main (excluded from rotation).
      # Oi 4 ≥ 4 AND 4 ≥ 1 → rotation.
      # Noise 3 < 4 (MIN_RECORDS) → omitted.
      # Other 87 → main (excluded).
      expect(candidates.size).to eq(1)
      expect(candidates.first.slug).to eq("style-oi")
    end

    it "returns empty array when no rotation candidates exist" do
      punk  = 6.times.map { instance_double(Listing, styles: [ "Punk" ]) }
      other = 94.times.map { instance_double(Listing, styles: [ "Other" ]) }

      candidates = axis.thematic_candidates(punk + other)

      expect(candidates).to eq([])
    end

    it "excludes suppressed broad styles" do
      # Pop Rock suppressed by Punk overlap.
      punk_pop = 4.times.map { instance_double(Listing, styles: %w[Punk Pop\ Rock]) }
      pop_only = 1.times.map { instance_double(Listing, styles: [ "Pop Rock" ]) }
      punk_only = 5.times.map { instance_double(Listing, styles: [ "Punk" ]) }
      other = 90.times.map { instance_double(Listing, styles: [ "Other" ]) }

      candidates = axis.thematic_candidates(punk_pop + pop_only + punk_only + other)

      # Pop Rock 5 total, 4 overlap (80% ≥ 75%) → suppressed.
      # Punk 9 → main.
      # Pop Rock suppressed → not in rotation.
      expect(candidates.map(&:name)).not_to include("Pop Rock")
    end
  end

  describe "memoization" do
    it "reuses one StyleSelection for repeated calls with the same listings" do
      listings = 20.times.map { instance_double(Listing, styles: [ "Punk" ]) }

      expect(StyleSelection).to receive(:new).once.and_call_original

      axis.main_counts(listings)
      axis.allocation_order(listings)
      axis.display_order(listings)
      axis.thematic_candidates(listings)
    end
  end
end
