require "rails_helper"
require "rake"

RSpec.describe "experiment:generate" do
  let!(:store) { create(:store, discogs_username: "freebirdrecords", catalog_coverage: "partial", last_synced_at: 1.hour.ago) }

  before(:all) do
    Rake.application = Rake::Application.new
    Rails.application.load_tasks
  end

  after do
    Rake::Task["experiment:generate"].reenable
    FileUtils.rm_rf(Rails.root.join("experiments", "test-crate"))
  end

  it "writes a seed JSON file and prints summary" do
    15.times do |i|
      create(:listing, store:, format: "Vinyl, LP", discogs_release_id: "rake-#{i}",
        artist: "Rake #{i}", year: 1972, genres: [ "Jazz" ], condition: "Near Mint",
        want_count: 100, have_count: 10, last_seen_at: Time.current,
        cover_image_url: "https://example.com/c.jpg", thumbnail_url: "https://example.com/t.jpg")
    end

    expect { Rake::Task["experiment:generate"].invoke("test-crate") }
      .to output(/Generating seed crate/).to_stdout

    seed_path = Rails.root.join("experiments", "test-crate", "seed.json")
    expect(File.exist?(seed_path)).to be(true)
    data = JSON.parse(File.read(seed_path))
    expect(data).to be_an(Array)
    expect(data.first).to have_key("artist")
  end

  it "raises without a crate name" do
    expect { Rake::Task["experiment:generate"].invoke }
      .to raise_error(RuntimeError, /Usage/)
  end
end
