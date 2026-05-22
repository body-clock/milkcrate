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

  desc "Generate a crate of top-scored records — rake experiment:generate[crate-name]"
  task :generate, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:generate[crate-name]" unless args[:crate_name]

    safe_name = sanitize_crate_name(args[:crate_name])
    store = demo_store
    puts "Generating crate '#{safe_name}' for #{store.name}..."

    result = Experiments::SeedGenerator.call(store_id: store.id, crate_name: safe_name)

    dir = Rails.root.join("experiments", safe_name)
    FileUtils.mkdir_p(dir)

    path = dir.join("seed.json")
    File.write(path, JSON.pretty_generate(result.seed_data))
    puts "Wrote #{result.total_records} records to #{path}"
    puts "Excluded #{result.excluded_count} already-labeled records from previous crates"

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

  desc "Start a local server for the labeling page — rake experiment:serve[crate-name]"
  task :serve, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:serve[crate-name]" unless args[:crate_name]

    safe_name = sanitize_crate_name(args[:crate_name])
    dir = Rails.root.join("experiments", safe_name)

    raise "Crate directory not found: #{dir}. Run experiment:generate first." unless Dir.exist?(dir)
    raise "label.html not found in #{dir}. Run experiment:generate first." unless File.exist?(dir.join("label.html"))

    port = ENV.fetch("PORT", 8000).to_i
    server_ru = Rails.root.join("experiments", "server.ru")
    raise "Server config not found at #{server_ru}" unless File.exist?(server_ru)

    puts "Serving crate at:"
    puts
    puts "  http://localhost:#{port}/label.html"
    puts
    puts "Label each record Junk [J], Indifferent [I], or Cool [K]."
    puts "When done, click 'Save to Server' to save results.json automatically."
    puts "Then run: bin/rake 'experiment:report[#{safe_name}]'"
    puts
    puts "Press Ctrl+C to stop."

    ENV["CRATE_DIR"] = dir.to_s
    system("bundle", "exec", "rackup", "--port", port.to_s, server_ru.to_s)
  end

  desc "Print the experiment report and save to file — rake experiment:report[crate-name]"
  task :report, [ :crate_name ] => :environment do |_, args|
    raise "Usage: rake experiment:report[crate-name]" unless args[:crate_name]

    safe_name = sanitize_crate_name(args[:crate_name])
    crate_dir = Rails.root.join("experiments", safe_name)

    raise "Crate directory not found: #{crate_dir}. Run experiment:generate first." unless Dir.exist?(crate_dir)

    report_script = Rails.root.join("analysis", "report.rb")
    raise "Report script not found at #{report_script}" unless File.exist?(report_script)

    output_path = crate_dir.join("report.txt")
    output = `ruby #{report_script} #{crate_dir} 2>&1`
    puts output
    File.write(output_path, output)
    puts "Report saved to #{output_path}"
  end

  desc "Cross-crate pattern analysis — rake experiment:analyze"
  task analyze: :environment do
    script = Rails.root.join("analysis", "analyze.rb")
    raise "Analysis script not found at #{script}" unless File.exist?(script)
    exec("ruby", script.to_s)
  end
end
