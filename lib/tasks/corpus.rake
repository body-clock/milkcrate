require "json"

namespace :corpus do
  desc "Refresh committed Discogs snapshot: corpus:refresh[username,max_pages]"
  task :refresh, [ :username, :max_pages ] => :environment do |_task, args|
    username = args[:username].presence || ENV["DISCOGS_USERNAME"]
    raise ArgumentError, "username is required (arg or DISCOGS_USERNAME)" if username.blank?

    max_pages = (args[:max_pages] || 5).to_i
    Corpus::DiscogsSnapshotExporter.new(username:, max_pages:).call
  end

  desc "Seed database from committed Discogs snapshot"
  task seed: :environment do
    result = Corpus::DiscogsSnapshotImporter.new.import
    puts result.inspect
  end

  desc "Print snapshot corpus stats"
  task stats: :environment do
    snapshot_path = Rails.root.join("db/corpus/discogs_store_snapshot.json")
    payload = JSON.parse(File.read(snapshot_path))
    listings = payload.fetch("listings")

    unique_genres = listings.flat_map { |row| Array(row["genres"]) }.compact.uniq.size
    unique_styles = listings.flat_map { |row| Array(row["styles"]) }.compact.uniq.size

    puts "snapshot=#{snapshot_path}"
    puts "listings=#{listings.size}"
    puts "unique_genres=#{unique_genres}"
    puts "unique_styles=#{unique_styles}"
    puts "size_bytes=#{File.size(snapshot_path)}"
  end
end
