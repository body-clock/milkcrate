#!/usr/bin/env ruby
# report.rb — Simple experiment report.
#
# Usage:
#   ruby analysis/report.rb experiments/crate-name/
#
# Reads seed.json and results.json from the crate directory.
# Prints:
#   1. Score distribution for each label (junk / indifferent / cool)
#   2. Not-cool records (junk + indifferent) ranked by score descending,
#      with per-strategy breakdown showing why each scored high

require "json"

dir = ARGV[0]
abort "Usage: ruby analysis/report.rb <crate-dir>" unless dir
abort "Directory not found: #{dir}" unless Dir.exist?(dir)

seed_path    = File.join(dir, "seed.json")
results_path = File.join(dir, "results.json")

abort "seed.json not found in #{dir}" unless File.exist?(seed_path)
abort "results.json not found in #{dir}. Label the crate first." unless File.exist?(results_path)

seed    = JSON.parse(File.read(seed_path))
results = JSON.parse(File.read(results_path))

# Index seed by position
seed_by_pos = seed.each_with_object({}) { |r, h| h[r["position"]] = r }

# Merge labels onto seed data
labeled = results.map do |r|
  entry = seed_by_pos[r["position"]]
  next nil unless entry
  entry.merge("label" => r["label"])
end.compact

abort "No labeled records found. Results file doesn't match seed." if labeled.empty?

# ── 1. Score distribution per label ────────────────────
puts "=" * 60
puts "EXPERIMENT REPORT"
puts "=" * 60
puts
puts "Records labeled: #{labeled.size}"
puts

bands = { "junk" => [], "indifferent" => [], "cool" => [] }
labeled.each { |r| bands[r["label"]] << r["algorithm_score"] }

puts "Score ranges by label:"
puts "-" * 60
bands.each do |label, scores|
  next if scores.empty?
  min = scores.min
  max = scores.max
  mean = scores.sum / scores.size
  puts "  %-13s n=%-3d  mean=%+.2f  range=[%+.2f, %+.2f]" % [label, scores.size, mean, min, max]
end
puts

# ── 2. Not-cool records, sorted by score descending ────
not_cool = labeled.select { |r| r["label"] == "junk" || r["label"] == "indifferent" }
  .sort_by { |r| -r["algorithm_score"] }

puts "=" * 60
puts "NOT-COOL RECORDS (highest-scoring first)"
puts "Why did the algorithm think these were interesting?"
puts "=" * 60
puts

if not_cool.empty?
  puts "  (none — every record was labeled cool!)"
else
  not_cool.each_with_index do |r, i|
    score = r["algorithm_score"]
    breakdown = r["score_breakdown"] || {}

    puts "#{i + 1}. #{r["artist"]} — #{r["title"]}"
    puts "   Label: #{r["label"]}  |  Score: #{format("%+.2f", score)}"
    puts "   #{r["year"] && r["year"] > 0 ? r["year"] : "?"}  |  #{Array(r["genres"]).first || "?"}  |  #{r["condition"]}  |  $#{r["price"]}"
    puts "   Want/Have: #{r["want_count"] || 0}/#{r["have_count"] || 0}"

    unless breakdown.empty?
      # Sort strategies by contribution (highest absolute first)
      contribs = breakdown.sort_by { |_, v| -v.abs }
      puts "   Score breakdown:"
      contribs.each do |strat, val|
        puts "     %-20s %+.2f" % [strat, val]
      end
    end

    puts
  end
end

# ── 3. Cool records summary ────────────────────────────
cool = labeled.select { |r| r["label"] == "cool" }
puts "=" * 60
puts "COOL RECORDS (#{cool.size})"
puts "=" * 60
puts
cool.each do |r|
  score = r["algorithm_score"]
  puts "  #{format("%+.2f", score)}  #{r["artist"]} — #{r["title"]}"
end
puts
