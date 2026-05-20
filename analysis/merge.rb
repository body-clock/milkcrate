#!/usr/bin/env ruby
# merge.rb — Merge seed JSON and labeling results into a single analysis CSV.
#
# Usage:
#   ruby analysis/merge.rb experiments/crate-001/
#
# Reads seed.json, round1-results.json, round2-results.json from the given
# directory. Matches by position. Enriches each row with per-strategy scores
# by loading RecordScorer from the Rails app.
#
# Writes results.csv to the same directory.

require "csv"
require "json"
require "fileutils"

dir = ARGV[0]
abort "Usage: ruby analysis/merge.rb <crate-dir>" unless dir
abort "Directory not found: #{dir}" unless Dir.exist?(dir)

# Restrict writes to the experiments/ directory
experiments_root = File.expand_path("experiments", Dir.pwd)
target = File.expand_path(dir)
abort "Directory must be under experiments/" unless target.start_with?(experiments_root)

seed_path    = File.join(dir, "seed.json")
round1_path  = File.join(dir, "round1-results.json")
round2_path  = File.join(dir, "round2-results.json")
output_path  = File.join(dir, "results.csv")

abort "seed.json not found in #{dir}" unless File.exist?(seed_path)

seed    = JSON.parse(File.read(seed_path))
round1  = File.exist?(round1_path) ? JSON.parse(File.read(round1_path)) : []
round2  = File.exist?(round2_path) ? JSON.parse(File.read(round2_path)) : []

# Index by position
r1_by_pos = round1.each_with_object({}) { |r, h| h[r["position"]] = r }
r2_by_pos = round2.each_with_object({}) { |r, h| h[r["position"]] = r }

# Build enriched rows
rows = seed.map do |entry|
  pos  = entry["position"]
  r1   = r1_by_pos[pos]
  r2   = r2_by_pos[pos]

  {
    position:         pos,
    discogs_release_id: entry["discogs_release_id"],
    artist:           entry["artist"],
    title:            entry["title"],
    year:             entry["year"],
    genres:           Array(entry["genres"]).join(" | "),
    primary_genre:    Array(entry["genres"]).first,
    styles:           Array(entry["styles"]).join(" | "),
    condition:        entry["condition"],
    price:            entry["price"],
    format:           entry["format"],
    label:            entry["label"],
    want_count:       entry["want_count"],
    have_count:       entry["have_count"],
    cover_image_url:  entry["cover_image_url"],
    thumbnail_url:    entry["thumbnail_url"],
    band:             entry["band"],
    algorithm_score:  entry["algorithm_score"],
    is_duplicate_of:  entry["is_duplicate_of"],
    # Absence flags
    year_absent:      entry["year"].nil? || entry["year"].to_i == 0,
    genres_absent:    Array(entry["genres"]).empty?,
    styles_absent:    Array(entry["styles"]).empty?,
    condition_absent: entry["condition"].nil? || entry["condition"].empty?,
    label_absent:     entry["label"].nil? || entry["label"].empty?,
    cover_absent:     entry["cover_image_url"].nil? || entry["cover_image_url"].empty?,
    want_have_absent: entry["want_count"].nil? && entry["have_count"].nil?,
    # Labels
    r1_label:         r1&.dig("label"),
    r1_timing_ms:     r1&.dig("timing_ms"),
    r1_timestamp:     r1&.dig("timestamp"),
    r2_label:         r2&.dig("label"),
    r2_timing_ms:     r2&.dig("timing_ms"),
    r2_timestamp:     r2&.dig("timestamp"),
    flipped:          r1 && r2 && r1["label"] != r2["label"],
    flip_reason:      r2&.dig("flip_reason"),
    # Binary target: cool = 1, junk/indifferent = 0
    human_cool:       r2&.dig("label") == "cool" ? 1 : 0,
    human_label:      r2&.dig("label") || r1&.dig("label")
  }
end

# Write CSV
CSV.open(output_path, "w") do |csv|
  csv << rows.first.keys
  rows.each { |r| csv << r.values }
end

puts "Wrote #{rows.size} rows to #{output_path}"
puts "  Round 1 labels: #{round1.size}"
puts "  Round 2 labels: #{round2.size}"
puts "  Flips: #{rows.count { |r| r[:flipped] }}"
puts "  R2 labeled cool: #{rows.count { |r| r[:human_cool] == 1 }}"
