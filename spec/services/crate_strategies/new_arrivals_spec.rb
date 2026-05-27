require "rails_helper"

RSpec.describe CrateStrategies::NewArrivals do
  include ActiveSupport::Testing::TimeHelpers

  subject(:strategy) { described_class.new(genre_counts: {}, today: Date.new(2026, 5, 27)) }

  let(:scorer) { instance_double(RecordScorer) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
    allow(scorer).to receive(:score) { |listing| listing.id }
  end

  def listing(id, listed_at:)
    instance_double(Listing, id:, listed_at:)
  end

  it "selects ranked listings from the earliest qualifying arrival window" do
    travel_to(Time.zone.parse("2026-05-27 12:00:00")) do
      recent = (1..4).map { |id| listing(id, listed_at: 2.days.ago) }
      older = listing(5, listed_at: 20.days.ago)

      selected = strategy.select(recent + [ older ], excluded_ids: Set.new)

      expect(selected).to eq(recent.reverse)
    end
  end
end
