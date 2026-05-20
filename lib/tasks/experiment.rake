require "json"

namespace :experiment do
  def demo_store
    store = Store.find_by(discogs_username: Settings.demo_store.discogs_username)
    raise "No store found for username '#{Settings.demo_store.discogs_username}'. Create one via the Rails console." unless store
    store
  end

  desc "Generate a stratified seed crate — rake experiment:generate[crate-001]"
  task :generate, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:generate[crate-001]" unless args[:crate_name]

    safe_name = File.basename(args[:crate_name])
    raise "Invalid crate name: #{safe_name}" unless safe_name.match?(/\A[a-z][a-z0-9-]{0,30}\z/)

    store = demo_store
    puts "Generating seed crate '#{safe_name}' for #{store.name}..."

    result = Experiments::SeedGenerator.call(store_id: store.id, crate_name: safe_name)

    dir = Rails.root.join("experiments", safe_name)
    FileUtils.mkdir_p(dir)
    path = dir.join("seed.json")
    File.write(path, JSON.pretty_generate(result.seed_data))
    puts "Wrote #{result.total_records} records to #{path}"

    puts "Band distribution:"
    result.band_counts.each do |band, count|
      puts "  #{band}: #{count}"
    end
    puts "Duplicates injected: #{result.duplicate_count}"
  end
end
