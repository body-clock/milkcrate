require "json"

namespace :experiment do
  def demo_store
    store = Store.find_by(discogs_username: Settings.demo_store.discogs_username)
    raise "No store found for username '#{Settings.demo_store.discogs_username}'. Create one via the Rails console." unless store
    store
  end

  def sanitize_crate_name(raw)
    safe = File.basename(raw)
    raise "Invalid crate name: #{safe}" unless safe.match?(/\A[a-z][a-z0-9-]{0,30}\z/)
    safe
  end

  desc "Generate a stratified seed crate + copy labeling template — rake experiment:generate[crate-001]"
  task :generate, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:generate[crate-001]" unless args[:crate_name]

    safe_name = sanitize_crate_name(args[:crate_name])
    store = demo_store
    puts "Generating seed crate '#{safe_name}' for #{store.name}..."

    result = Experiments::SeedGenerator.call(store_id: store.id, crate_name: safe_name)

    dir = Rails.root.join("experiments", safe_name)
    FileUtils.mkdir_p(dir)

    # Write seed JSON
    path = dir.join("seed.json")
    File.write(path, JSON.pretty_generate(result.seed_data))
    puts "Wrote #{result.total_records} records to #{path}"

    puts "Band distribution:"
    result.band_counts.each do |band, count|
      puts "  #{band}: #{count}"
    end
    puts "Duplicates injected: #{result.duplicate_count}"

    # Copy labeling template
    template = Rails.root.join("analysis", "label.html")
    if File.exist?(template)
      FileUtils.cp(template, dir.join("label.html"))
      puts "Copied labeling page to #{dir}/label.html"
    else
      puts "Warning: labeling template not found at #{template}"
    end

    puts
    puts "Next: bin/rake 'experiment:serve[#{safe_name}]'"
  end

  desc "Start a local HTTP server for the labeling page — rake experiment:serve[crate-001]"
  task :serve, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:serve[crate-001]" unless args[:crate_name]

    safe_name = sanitize_crate_name(args[:crate_name])
    dir = Rails.root.join("experiments", safe_name)

    raise "Crate directory not found: #{dir}. Run experiment:generate first." unless Dir.exist?(dir)
    raise "label.html not found in #{dir}. Run experiment:generate first." unless File.exist?(dir.join("label.html"))

    port = ENV.fetch("PORT", 8000).to_i
    puts "Serving labeling page at:"
    puts
    puts "  Round 1: http://localhost:#{port}/label.html?round=1"
    puts "  Round 2: http://localhost:#{port}/label.html?round=2"
    puts
    puts "Press Ctrl+C to stop."
    puts

    Dir.chdir(dir) do
      system("python3", "-m", "http.server", port.to_s)
    end
  end

  desc "Merge labeling results and run all analysis scripts — rake experiment:analyze[crate-001]"
  task :analyze, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:analyze[crate-001]" unless args[:crate_name]

    safe_name = sanitize_crate_name(args[:crate_name])
    crate_dir = Rails.root.join("experiments", safe_name)

    raise "Crate directory not found: #{crate_dir}" unless Dir.exist?(crate_dir)

    results_csv = crate_dir.join("results.csv")
    analysis_root = Rails.root.join("analysis")

    scripts = {
      "merge"                => [ "ruby", analysis_root.join("merge.rb").to_s, crate_dir.to_s ],
      "seams (confusion)"    => [ "ruby", analysis_root.join("seams.rb").to_s, results_csv.to_s ],
      "logistic regression"  => [ "ruby", analysis_root.join("logistic_regression.rb").to_s, results_csv.to_s ],
      "anti-scorer"          => [ "ruby", analysis_root.join("anti_scorer.rb").to_s, results_csv.to_s ],
      "absence profile"      => [ "ruby", analysis_root.join("absence_profile.rb").to_s, results_csv.to_s ],
      "ablation"             => [ "ruby", "-I", "app", analysis_root.join("ablation.rb").to_s, results_csv.to_s ],
      "evaluate"             => [ "ruby", analysis_root.join("evaluate.rb").to_s, results_csv.to_s, safe_name ]
    }

    scripts.each do |label, cmd|
      puts "━━━ #{label} ━━━"
      puts
      system(*cmd)
      puts
    end
  end
end
