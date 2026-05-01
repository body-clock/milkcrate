require "rails_helper"
require "json"
require_relative "../../../app/services/picks_selector"

RSpec.describe "PicksSelector corpus integration" do
  it "can score records from the committed corpus snapshot" do
    snapshot_path = Rails.root.join("db/corpus/discogs_store_snapshot.json")
    skip "snapshot missing" unless File.exist?(snapshot_path)

    payload = JSON.parse(File.read(snapshot_path))
    Corpus::DiscogsSnapshotImporter.new(snapshot_path: snapshot_path).import
    store = Store.find_by!(discogs_username: payload.dig("store", "discogs_username"))

    picks = PicksSelector.new(store).select_picks(count: 10, seed: 123)

    expect(picks).not_to be_empty
    expect(picks.size).to be <= 10
  end
end
