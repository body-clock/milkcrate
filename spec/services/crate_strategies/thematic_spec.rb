require "rails_helper"

RSpec.describe CrateStrategies::Thematic do
  subject(:strategy) { described_class.new(store_id: 1, genre_counts: {}, today: Date.new(2026, 5, 27)) }

  let(:scorer) { instance_double(RecordScorer) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
    allow(scorer).to receive(:score) { |listing| listing.id }
  end

  def listing(id, style:)
    instance_double(Listing, id:, styles: [ style ], primary_genre: nil, sort_key: [ id ])
  end

  it "selects and ranks records from an eligible storefront theme" do
    themed = (1..4).map { |id| listing(id, style: "Rare Groove") }
    outside_theme = listing(5, style: "Bebop")

    name, selected = strategy.select(themed + [ outside_theme ], excluded_ids: Set.new)

    expect(name).to eq("Rare Groove")
    expect(selected).to eq(themed.reverse)
  end

  context "with explicit themes" do
    it "uses only the provided themes instead of pool discovery" do
      oi_theme = StorefrontTheme.style("Oi")
      strategy = described_class.new(
        store_id: 1, genre_counts: {}, themes: [ oi_theme ],
        today: Date.new(2026, 5, 27)
      )

      # Pool has 5 Punk + 4 Oi. Discovery would find both Punk and Oi themes.
      # With explicit themes: only Oi is considered.
      punk = (1..5).map { |id| listing(id, style: "Punk") }
      oi   = (6..9).map { |id| listing(id, style: "Oi") }
      pool = punk + oi

      name, _selected = strategy.select(pool, excluded_ids: Set.new)

      expect(name).to eq("Oi")
    end

    it "filters provided themes by eligibility against the current pool" do
      doom_theme  = StorefrontTheme.style("Doom Metal")
      noise_theme = StorefrontTheme.style("Noise")
      strategy = described_class.new(
        store_id: 1, genre_counts: {}, themes: [ doom_theme, noise_theme ],
        today: Date.new(2026, 5, 27)
      )

      # Only Noise has >= 4 listings in the pool; Doom Metal has only 2.
      doom  = (1..2).map { |id| listing(id, style: "Doom Metal") }
      noise = (4..7).map { |id| listing(id, style: "Noise") }
      pool  = doom + noise

      name, _selected = strategy.select(pool, excluded_ids: Set.new)

      # Doom Metal ineligible (< 4), Noise eligible → only Noise chosen.
      expect(name).to eq("Noise")
    end

    it "returns nil when no provided theme is viable after exclusions" do
      noise_theme = StorefrontTheme.style("Noise")
      strategy = described_class.new(
        store_id: 1, genre_counts: {}, themes: [ noise_theme ],
        today: Date.new(2026, 5, 27)
      )

      # Noise has 4 listings but 1 is excluded → 3 remain, below MIN_RECORDS.
      noise = (1..4).map { |id| listing(id, style: "Noise") }
      result = strategy.select(noise, excluded_ids: Set.new([ 1 ]))

      expect(result).to be_nil
    end

    it "returns nil when no pre-computed themes are provided" do
      strategy = described_class.new(
        store_id: 1, genre_counts: {}, themes: [],
        today: Date.new(2026, 5, 27)
      )

      pool = (1..10).map { |id| listing(id, style: "Punk") }
      result = strategy.select(pool, excluded_ids: Set.new)

      expect(result).to be_nil
    end

    it "is deterministic for the same store and date with pre-computed themes" do
      oi_theme   = StorefrontTheme.style("Oi")
      doom_theme = StorefrontTheme.style("Doom Metal")

      oi   = (1..4).map { |id| listing(id, style: "Oi") }
      doom = (5..8).map { |id| listing(id, style: "Doom Metal") }
      pool = oi + doom

      themes = [ oi_theme, doom_theme ]
      a = described_class.new(store_id: 42, genre_counts: {}, themes:, today: Date.new(2026, 6, 1))
      b = described_class.new(store_id: 42, genre_counts: {}, themes:, today: Date.new(2026, 6, 1))

      result_a = a.select(pool, excluded_ids: Set.new)
      result_b = b.select(pool, excluded_ids: Set.new)

      expect(result_a).to eq(result_b)
    end
  end
end
