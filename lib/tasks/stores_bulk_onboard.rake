# frozen_string_literal: true

namespace :stores do
  desc "Bulk onboard Discogs sellers from a YAML file or inline keys.
Usage:
  rake stores:bulk_onboard                            # Onboard the default list
  rake 'stores:bulk_onboard[usernames.yml]'            # Onboard from a YAML file
  rake 'stores:bulk_onboard[usernames.yml,true]'        # Preview mode (dry-run)

YAML format:
  usernames:
    - philadelphiamusic
    - supermicah
    - amoeba_records"
  task :bulk_onboard, [ :file, :dry_run ] => :environment do |_t, args|
    file = args[:file] || Rails.root.join("config", "stores.yml")
    dry_run = args[:dry_run] == "true"

    usernames = if file && File.exist?(file)
      YAML.safe_load_file(file)["usernames"]
    else
      default_usernames
    end

    puts "Found #{usernames.size} usernames#{dry_run ? ' (DRY RUN)' : ''}"
    puts

    stats = { created: 0, skipped: 0, failed: 0, errors: [] }

    usernames.each do |username|
      slug = username.to_s.strip.downcase
      print "  #{slug}..."

      if slug.blank?
        puts " SKIP (blank)"
        stats[:skipped] += 1
        next
      end

      if Store.with_discogs_username(slug).exists?
        puts " SKIP (already exists)"
        stats[:skipped] += 1
        next
      end

      if dry_run
        puts " WOULD CREATE"
        stats[:created] += 1
        next
      end

      begin
        result = StoreOnboarding.call(discogs_username: slug)
        ScrapeStoreLocationJob.perform_later(result.store.id)
        puts " OK ##{result.store.id}"
        stats[:created] += 1
      rescue StoreOnboarding::Error => e
        puts " FAIL (#{e.message})"
        stats[:failed] += 1
        stats[:errors] << { username: slug, error: e.message }
      rescue Discogs::Errors::RateLimitError
        puts " RATE LIMITED (backing off 60s)"
        stats[:failed] += 1
        stats[:errors] << { username: slug, error: "rate limited" }
        sleep 60
        retry
      rescue StandardError => e
        puts " FAIL (#{e.message})"
        stats[:failed] += 1
        stats[:errors] << { username: slug, error: e.message }
      end

      # Stagger to avoid rate limits — 2 requests per store (profile + sync)
      sleep 1
    end

    puts
    puts "=== Results ==="
    puts "  Created: #{stats[:created]}"
    puts "  Skipped: #{stats[:skipped]}"
    puts "  Failed:  #{stats[:failed]}"
    if stats[:errors].any?
      puts "  Errors:"
      stats[:errors].each { |e| puts "    - #{e[:username]}: #{e[:error]}" }
    end
    puts "Done."
  end

  desc "Verify Discogs usernames exist without onboarding.
Usage:
  rake 'stores:verify[usernames.yml]'       # Check usernames from YAML
  rake 'stores:verify[usernames.yml,true]'  # Show only invalid ones"
  task :verify, [ :file, :quiet ] => :environment do |_t, args|
    file = args[:file] || Rails.root.join("config", "stores.yml")
    quiet = args[:quiet] == "true"

    usernames = YAML.safe_load_file(file)["usernames"]
    total = usernames.size
    valid = 0
    invalid = []

    puts "Verifying #{total} usernames against Discogs API..."
    puts

    usernames.each do |username|
      slug = username.to_s.strip.downcase
      print "." unless quiet

      begin
        DiscogsClient.new.seller_profile(slug)
        valid += 1
      rescue Discogs::Errors::ApiError
        invalid << slug
        puts "\n  INVALID: #{slug}" unless quiet
      end

      sleep 0.5
    end

    puts unless quiet
    puts
    puts "#{valid}/#{total} valid, #{invalid.size} invalid"

    if invalid.any?
      puts "Remove these from stores.yml:"
      invalid.each { |s| puts "  - #{s}" }
    end
  end
end

def default_usernames
  # Known record stores and active Discogs sellers with substantial inventory.
  # Start with ~30 well-known stores; extend via config/stores.yml.
  %w[
    philadelphiamusic
    supermicah
    amoebamusic
    rough_trade
    portofsoundrecords
    acoustic_sounds
    turntablelab
    fatbeats
    rappcats
    gonna_give_it_to_ya
    streetlight_records
    cosmicvinyl
    waxidemics
    in_ya_dome_records
    daddykoolrecords
    vinyl_world_records
    soundgardenrecords
    disc_doctor
    popmarket
    deepgrooves
    toytronic_records
    black_metal_vinyl
    jazzvinyl
    globalgroove
    timeisneverwrong
    velvetvinyl
    rubadubrecords
    redeyerecords
    juno_records
    phonica_records
  ]
end
