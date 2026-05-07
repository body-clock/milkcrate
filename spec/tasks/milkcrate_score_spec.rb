require "rails_helper"
require "rake"

RSpec.describe "milkcrate:score" do
  let!(:store) { create(:store, discogs_username: "philadelphiamusic") }
  let!(:listing) do
    create(
      :listing,
      store: store,
      artist: "Test",
      title: "Record",
      year: 1975,
      genres: [ "Jazz" ],
      styles: [ "Bebop" ],
      condition: "VG+",
      want_count: 40,
      have_count: 20,
      last_surfaced_at: nil
    )
  end
  let(:expected_breakdown) do
    genre_counts = store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
    RecordScorer.new(genre_counts:, today: Date.today).score_breakdown(listing)
  end
  let(:expected_total) { expected_breakdown.values.sum.round(3) }

  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    Rake::Task["milkcrate:score"].reenable
  end

  it "prints a score breakdown for a valid listing" do
    expect { Rake::Task["milkcrate:score"].invoke(listing.id.to_s) }
      .to output(/TOTAL SCORE: #{Regexp.escape(expected_total.to_s)}/).to_stdout
  end

  it "prints the listing artist and title" do
    expect { Rake::Task["milkcrate:score"].invoke(listing.id.to_s) }
      .to output(/Test – Record/).to_stdout
  end

  it "prints the live scoring breakdown" do
    expect { Rake::Task["milkcrate:score"].invoke(listing.id.to_s) }
      .to output(/vintage:\s+#{Regexp.escape(expected_breakdown[:vintage].to_s)}/).to_stdout
  end

  it "raises without a listing ID" do
    expect { Rake::Task["milkcrate:score"].invoke }
      .to raise_error(RuntimeError, /Usage/)
  end
end
