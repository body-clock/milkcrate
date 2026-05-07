require "rails_helper"
require "json"

RSpec.describe "CrateStrategies::Picks corpus integration" do
  it "can score records from the committed corpus snapshot" do
    snapshot_path = Rails.root.join("db/corpus/discogs_store_snapshot.json")
    skip "snapshot missing" unless File.exist?(snapshot_path)

    payload = JSON.parse(File.read(snapshot_path))
    Corpus::DiscogsSnapshotImporter.new(snapshot_path: snapshot_path).import
    store = Store.find_by!(discogs_username: payload.dig("store", "discogs_username"))

    pool = store.listings.available.lp_only.to_a
    genre_counts = store.listings.available.lp_only.pluck(:genres).map(&:first).compact.tally
    strategy = CrateStrategies::Picks.new(genre_counts:, today: Date.today)
    picks = strategy.select(pool, excluded_ids: Set.new, count: 10)

    expect(picks).not_to be_empty
    expect(picks.size).to be <= 10
  end
end
