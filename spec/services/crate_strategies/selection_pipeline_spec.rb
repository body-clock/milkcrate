require "rails_helper"

RSpec.describe CrateStrategies::SelectionPipeline do
  # Create a minimal test strategy that includes the module
  let(:strategy_class) do
    Class.new do
      include CrateStrategies::SelectionPipeline

      def select(pool, excluded_ids:, scorer:)
        score_and_sort(pool, excluded_ids:, scorer:) { |candidates| candidates }
      end
    end
  end

  let(:store) { create(:store) }
  let(:scorer) { instance_double(RecordScorer, score: 1) }
  let(:listings) { create_list(:listing, 5, store:) }
  let(:pool) { listings }

  subject(:strategy) { strategy_class.new }

  describe "#score_and_sort" do
    it "excludes all IDs in excluded_ids from the result" do
      excluded = [ listings[0].id, listings[2].id ]

      result = strategy.select(pool, excluded_ids: Set.new(excluded), scorer:)

      expect(result).not_to include(listings[0], listings[2])
      expect(result).to include(listings[1], listings[3], listings[4])
    end

    it "passes candidates through the block's domain filter" do
      # Strategy uses a block that only keeps listings with even IDs
      filtering_strategy = Class.new do
        include CrateStrategies::SelectionPipeline

        def select(pool, excluded_ids:, scorer:)
          score_and_sort(pool, excluded_ids:, scorer:) { |candidates|
            candidates.select { |l| l.id.even? }
          }
        end
      end

      result = filtering_strategy.new.select(pool, excluded_ids: Set.new, scorer:)
      expect(result).to all(have_attributes(id: be_even))
    end

    it "returns candidates sorted by descending scorer score" do
      scores = { listings[0] => 3, listings[1] => 5, listings[2] => 1, listings[3] => 4, listings[4] => 2 }
      allow(scorer).to receive(:score) { |listing| scores[listing] || 0 }

      result = strategy.select(pool, excluded_ids: Set.new, scorer:)

      expected_order = [ listings[1], listings[3], listings[0], listings[4], listings[2] ]
      expect(result).to eq(expected_order)
    end

    it "returns an empty array when all listings are excluded" do
      all_ids = listings.map(&:id).to_set

      result = strategy.select(pool, excluded_ids: all_ids, scorer:)

      expect(result).to be_empty
    end

    it "supports a block that further narrows the candidate set" do
      scorer = instance_double(RecordScorer)
      allow(scorer).to receive(:score).and_return(1)

      result = strategy.select(pool, excluded_ids: Set.new, scorer:)

      expect(result.size).to eq(5)
    end
  end
end
