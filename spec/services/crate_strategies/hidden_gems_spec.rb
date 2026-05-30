require "rails_helper"

RSpec.describe CrateStrategies::HiddenGems do
  subject(:strategy) { described_class.new(genre_counts: {}, today: Date.new(2026, 5, 27)) }

  let(:scorer) { instance_double(RecordScorer) }

  before do
    allow(RecordScorer).to receive(:new).and_return(scorer)
    allow(scorer).to receive(:score) { |listing| listing.id }
  end

  def listing(id, genre:, want_count: 20, have_count: 5, cover_image_url: "cover.jpg")
    instance_double(
      Listing,
      id:,
      primary_genre: genre,
      want_count:,
      have_count:,
      cover_image_url:,
      thumbnail_url: nil
    )
  end

  it "selects ranked low-engagement wanted listings with artwork" do
    obscure = (1..4).map { |id| listing(id, genre: "Genre #{id}") }
    common = listing(5, genre: "Other", want_count: 70, have_count: 50)

    selected = strategy.select(obscure + [ common ], excluded_ids: Set.new)

    expect(selected).to eq(obscure.reverse)
  end
end
