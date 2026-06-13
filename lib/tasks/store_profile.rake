namespace :store_profile do
  desc "Sync Discogs profile data for all stores (avatar, location, description, genre tags)"
  task sync_all: :environment do
    stores = Store.all
    total = stores.count

    puts "Syncing profile data for #{total} stores..."

    stores.find_each.with_index(1) do |store, index|
      puts "[#{index}/#{total}] Syncing #{store.discogs_username}..."
      StoreProfileSyncJob.perform_later(store.id)
    end

    puts "Done. Jobs enqueued for #{total} stores."
  end

  desc "Sync Discogs profile data for a specific store"
  task :sync_one, [ :username ] => :environment do |_t, args|
    username = args[:username]
    store = Store.find_by(discogs_username: username)

    if store.nil?
      puts "Store not found: #{username}"
      exit 1
    end

    puts "Syncing profile data for #{store.discogs_username}..."
    StoreProfileSyncJob.perform_now(store.id)
    store.reload

    puts "Done."
    puts "  avatar_url: #{store.avatar_url}"
    puts "  location: #{store.location}"
    puts "  description: #{store.description&.truncate(100)}"
    puts "  genre_tags: #{store.genre_tags.join(', ')}"
  end
end
