# Dev environment lifecycle tasks — Docker, database, and sample data management.
#
# Tools for bootstrapping a fresh development environment, loading sample data,
# and managing Docker services. These are the main entry points for daily dev work.
#
# For per-store operations (sync, enrich, curate), see stores.rake.

namespace :tools do
  SAMPLE_DATA_FILE = Rails.root.join("db/sample/listings.jsonl")

  # ── Helpers ──────────────────────────────────────────────────

  def wait_for_postgres(timeout: 30)
    puts "Waiting for PostgreSQL..."
    container = `docker compose ps -q postgres 2>/dev/null`.strip
    return unless container.present?

    timeout.times do
      result = system("docker compose exec -T postgres pg_isready -U postgres -d postgres 2>/dev/null")
      return if result
      sleep 1
    end
    raise "PostgreSQL did not become healthy within #{timeout} seconds"
  end

  def load_jsonl_line(line)
    data = JSON.parse(line)

    # Resolve or create the owning store owner (may be nil in snapshot)
    owner_attrs = data["store_owner"]
    store_owner = nil
    if owner_attrs
      store_owner = StoreOwner.find_or_create_by!(discogs_username: owner_attrs["discogs_username"]) do |o|
        o.owner_email = owner_attrs["owner_email"]
      end
    end

    # Resolve or create the store
    store_attrs = data["store"]
    store = Store.find_or_create_by!(discogs_username: store_attrs["discogs_username"]) do |s|
      s.name = store_attrs["name"]
      s.description = store_attrs["description"]
      s.inventory_page_count = store_attrs["inventory_page_count"] || 1
      s.catalog_coverage = store_attrs["catalog_coverage"] || "partial"
      s.store_owner = store_owner
    end

    # Resolve or create the release (may be nil in snapshot)
    release_attrs = data["release"]
    release = nil
    if release_attrs
      release = Release.find_or_create_by!(discogs_release_id: release_attrs["discogs_release_id"]) do |r|
        r.want_count = release_attrs["want_count"]
        r.have_count = release_attrs["have_count"]
        r.enriched_at = release_attrs["enriched_at"]
        r.musicbrainz_id = release_attrs["musicbrainz_id"]
        r.discogs_image_missing = release_attrs["discogs_image_missing"] || false
      end
    end

    # Resolve or create the listing
    listing_attrs = data["listing"]
    listing = Listing.find_or_create_by!(discogs_listing_id: listing_attrs["discogs_listing_id"]) do |l|
      l.store = store
      l.discogs_release_id = listing_attrs["discogs_release_id"]
      l.artist = listing_attrs["artist"]
      l.title = listing_attrs["title"]
      l.format = listing_attrs["format"]
      l.condition = listing_attrs["condition"]
      l.price = listing_attrs["price"]
      l.currency = listing_attrs["currency"] || "USD"
      l.genres = listing_attrs["genres"] || []
      l.styles = listing_attrs["styles"] || []
      l.label = listing_attrs["label"]
      l.year = listing_attrs["year"]
      l.want_count = listing_attrs["want_count"]
      l.have_count = listing_attrs["have_count"]
      l.notes = listing_attrs["notes"]
      l.cover_image_url = listing_attrs["cover_image_url"]
      l.thumbnail_url = listing_attrs["thumbnail_url"]
      l.tracklist = listing_attrs["tracklist"] || []
      l.listed_at = listing_attrs["listed_at"]
      l.last_seen_at = listing_attrs["last_seen_at"]
      l.surface_count = listing_attrs["surface_count"] || 0
      l.last_surfaced_at = listing_attrs["last_surfaced_at"]
    end

    listing
  end

  # ── Dev lifecycle ────────────────────────────────────────────

  desc "Start Docker services, create/migrate DB, and load sample data"
  task start: :environment do
    puts "==> Starting Docker services..."
    system("docker compose up -d") || raise("Failed to start Docker services")

    wait_for_postgres

    puts "==> Creating database..."
    Rake::Task["db:create"].invoke

    puts "==> Running migrations..."
    Rake::Task["db:migrate"].invoke

    puts "==> Loading sample data..."
    Rake::Task["tools:load"].invoke

    puts
    puts "  All set! Run `bin/dev` to start the dev server."
  end

  desc "Stop Docker services (preserves data volumes)"
  task :stop do
    system("docker compose stop") || raise("Failed to stop Docker services")
    puts "Docker services stopped."
  end

  desc "Stop and remove Docker volumes (destroys all data)"
  task :clean do
    system("docker compose down --volumes") || raise("Failed to clean Docker resources")
    puts "Docker resources removed."
  end

  # ── Sample data ──────────────────────────────────────────────

  desc "Load sample data from db/sample/listings.jsonl"
  task load: :environment do
    require "ruby-progressbar"

    raise "Sample data file not found at #{SAMPLE_DATA_FILE}" unless SAMPLE_DATA_FILE.exist?

    total_lines = File.foreach(SAMPLE_DATA_FILE).count

    if ENV["FORCE"]
      puts "==> Force mode: clearing existing data..."
      Listing.delete_all
      Release.delete_all
      Store.delete_all
      StoreOwner.delete_all
    end

    progress = ProgressBar.create(
      title: "Records",
      total: total_lines,
      format: "%t: %c/%C |%B|",
      throttle_rate: 0.1
    )

    File.foreach(SAMPLE_DATA_FILE) do |line|
      load_jsonl_line(line)
      progress.increment
    rescue JSON::ParserError => e
      puts "  Skipping malformed line: #{e.message}"
    end

    progress.finish

    store_count   = Store.count
    release_count = Release.count
    owner_count   = StoreOwner.count

    puts "Loaded #{total_lines} listings, #{release_count} releases, #{store_count} stores, #{owner_count} owners (force=#{!!ENV['FORCE']})"
  end

  desc "Capture sample data from a synced store to db/sample/listings.jsonl"
  task capture: :environment do
    username = ENV["STORE_USERNAME"] || Settings.demo_store.discogs_username
    store = Store.find_by(discogs_username: username)
    raise "Store not found for username '#{username}'. Sync one first via `stores:sync[username]`." unless store

    listings = store.listings.available.vinyl.order(listed_at: :desc).limit(1000)
    raise "No available vinyl listings found for #{store.name}. Sync the store first." if listings.empty?

    puts "Capturing #{listings.size} listings from #{store.name} (@#{store.discogs_username})..."

    # Ensure the directory exists
    SAMPLE_DATA_FILE.dirname.mkpath

    # Write atomically via temp file
    tmpfile = "#{SAMPLE_DATA_FILE}.tmp"
    File.open(tmpfile, "w") do |f|
      listings.find_each do |listing|
        store_owner = listing.store.store_owner
        release = Release.find_by(discogs_release_id: listing.discogs_release_id)

        line = {
          store: {
            discogs_username: listing.store.discogs_username,
            name: listing.store.name,
            description: listing.store.description,
            inventory_page_count: listing.store.inventory_page_count,
            catalog_coverage: listing.store.catalog_coverage
          },
          store_owner: store_owner ? {
            discogs_username: store_owner.discogs_username,
            owner_email: store_owner.owner_email
          } : nil,
          release: release ? {
            discogs_release_id: release.discogs_release_id,
            want_count: release.want_count,
            have_count: release.have_count,
            enriched_at: release.enriched_at,
            musicbrainz_id: release.musicbrainz_id,
            discogs_image_missing: release.discogs_image_missing
          } : nil,
          listing: {
            discogs_listing_id: listing.discogs_listing_id,
            discogs_release_id: listing.discogs_release_id,
            artist: listing.artist,
            title: listing.title,
            format: listing.format,
            condition: listing.condition,
            price: listing.price,
            currency: listing.currency,
            genres: listing.genres,
            styles: listing.styles,
            label: listing.label,
            year: listing.year,
            want_count: listing.want_count,
            have_count: listing.have_count,
            notes: listing.notes,
            cover_image_url: listing.cover_image_url,
            thumbnail_url: listing.thumbnail_url,
            tracklist: listing.tracklist,
            listed_at: listing.listed_at,
            last_seen_at: listing.last_seen_at,
            surface_count: listing.surface_count,
            last_surfaced_at: listing.last_surfaced_at
          }
        }.compact

        f.puts(JSON.generate(line))
      end
    end

    File.rename(tmpfile, SAMPLE_DATA_FILE)
    puts "Wrote #{listings.size} listings to #{SAMPLE_DATA_FILE}"
  end
end
