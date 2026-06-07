require "rails_helper"

RSpec.describe CrateStrategies::Genre do
  subject(:strategy) { described_class.new(genre:, genre_counts: {}, curation_axis:, today: Date.new(2026, 6, 7)) }

  let(:scorer) { instance_double(RecordScorer, score: 10) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
    allow(scorer).to receive(:score).and_return(10)
  end

  context "when curation axis is genres" do
    let(:curation_axis) { :genres }

    it "selects listings matching the genre by primary_genre" do
      pool = [
        instance_double(Listing, id: 1, primary_genre: "Rock", styles: [ "Punk" ]),
        instance_double(Listing, id: 2, primary_genre: "Rock", styles: [ "Hardcore" ]),
        instance_double(Listing, id: 3, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 4, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 5, primary_genre: "Rock", styles: [ "Indie Rock" ]),
        instance_double(Listing, id: 6, primary_genre: "Rock", styles: [ "Classic Rock" ])
      ]
      strategy = described_class.new(genre: "Rock", genre_counts: {}, curation_axis: :genres, today: Date.new(2026, 6, 7))
      selected = strategy.select(pool, excluded_ids: Set.new)
      expect(selected.size).to eq(4)
      expect(selected.map(&:id)).to match_array([ 1, 2, 5, 6 ])
    end

    it "does not match listings from other genres" do
      pool = [
        instance_double(Listing, id: 1, primary_genre: "Rock", styles: [ "Punk" ]),
        instance_double(Listing, id: 2, primary_genre: "Rock", styles: [ "Hardcore" ]),
        instance_double(Listing, id: 3, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 4, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 5, primary_genre: "Jazz", styles: [ "Cool Jazz" ]),
        instance_double(Listing, id: 6, primary_genre: "Jazz", styles: [ "Fusion" ])
      ]
      strategy = described_class.new(genre: "Jazz", genre_counts: {}, curation_axis: :genres, today: Date.new(2026, 6, 7))
      selected = strategy.select(pool, excluded_ids: Set.new)
      expect(selected.map(&:id)).to match_array([ 3, 4, 5, 6 ])
    end
  end

  context "when curation axis is styles" do
    let(:curation_axis) { :styles }

    it "selects listings matching the genre by styles array" do
      pool = [
        instance_double(Listing, id: 1, primary_genre: "Rock", styles: [ "Bebop" ]),
        instance_double(Listing, id: 2, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 3, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 4, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 5, primary_genre: "Jazz", styles: [ "Cool Jazz" ])
      ]
      strategy = described_class.new(genre: "Bebop", genre_counts: {}, curation_axis: :styles, today: Date.new(2026, 6, 7))
      selected = strategy.select(pool, excluded_ids: Set.new)
      expect(selected.size).to eq(4)
      expect(selected.map(&:id)).to match_array([ 1, 2, 3, 4 ])
    end

    it "does not match listings that don't include the style" do
      pool = [
        instance_double(Listing, id: 1, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 2, primary_genre: "Jazz", styles: [ "Cool Jazz" ]),
        instance_double(Listing, id: 3, primary_genre: "Electronic", styles: [ "House" ]),
        instance_double(Listing, id: 4, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 5, primary_genre: "Jazz", styles: [ "Bebop" ]),
        instance_double(Listing, id: 6, primary_genre: "Jazz", styles: [ "Bebop" ])
      ]
      strategy = described_class.new(genre: "Bebop", genre_counts: {}, curation_axis: :styles, today: Date.new(2026, 6, 7))
      selected = strategy.select(pool, excluded_ids: Set.new)
      expect(selected.map(&:id)).to match_array([ 1, 4, 5, 6 ])
    end
  end
end
