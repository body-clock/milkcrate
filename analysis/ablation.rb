#!/usr/bin/env ruby
# ablation.rb — Run RecordScorer 8 times, each omitting one strategy.
#
# Usage (from project root):
#   ruby -I app analysis/ablation.rb experiments/crate-001/results.csv
#
# Measures Δagreement with human labels when each strategy is removed.

require "csv"

abort "Usage: ruby analysis/ablation.rb <results.csv>" unless ARGV[0]
abort "File not found: #{ARGV[0]}" unless File.exist?(ARGV[0])

rows = CSV.read(ARGV[0], headers: true)

STRATEGIES = %i[vintage condition section desirability metadata cover_quality freshness noise]

# ── Load Rails ─────────────────────────────────────────────
begin
  require_relative "../config/environment"
rescue LoadError
  # Try loading just the needed classes
  $LOAD_PATH.unshift(File.expand_path("app", Dir.pwd))
  require "active_support/all"
  require "active_record"

  # Establish DB connection (loads database.yml from config/)
  db_config = YAML.load_file(File.expand_path("config/database.yml", Dir.pwd))
  env = ENV["RAILS_ENV"] || "development"
  ActiveRecord::Base.establish_connection(db_config[env])

  Dir[File.expand_path("app/models/**/*.rb", Dir.pwd)].each { |f| require f }
  Dir[File.expand_path("app/services/**/*.rb", Dir.pwd)].each { |f| require f }
  Dir[File.expand_path("app/values/**/*.rb", Dir.pwd)].each { |f| require f }
  require "settings"
end

# ── Build a scorer for each ablation variant ───────────────
def build_scorer(store_id, omit_strategy: nil)
  store = Store.find(store_id)
  genre_counts = store.listings.where(id: store.listings.lp_only.select(:id))
                       .pluck(:genres).map(&:first).compact.tally

  strategies = RecordScorer.default_strategies(genre_counts:, today: Date.today)
  strategies.delete(omit_strategy) if omit_strategy

  RecordScorer.new(strategies:, genre_counts:, today: Date.today)
end

# ── Get the demo store ────────────────────────────────────
store = Store.find_by(discogs_username: "philadelphiamusic") ||
        Store.find_by(discogs_username: "freebirdrecords") ||
        Store.first
abort "No store found" unless store

# ── Full scorer (baseline) ────────────────────────────────
full_scorer = build_scorer(store.id)

# ── Compute scores for each listing ───────────────────────
# We need Listing objects for scoring. Rebuild from CSV data.
listing_ids = rows.map { |r| r["discogs_release_id"] }.compact
listings_by_release = store.listings.where(discogs_release_id: listing_ids).index_by(&:discogs_release_id)

# ── Agreement helper ──────────────────────────────────────
def agreement(scorer, rows, listings_by_release)
  matches = 0
  total = 0
  rows.each do |row|
    listing = listings_by_release[row["discogs_release_id"]]
    next unless listing
    alg_label = scorer.score(listing) >= Settings.experiments.bands.warm_threshold ? "cool" : "not_cool"
    human_label = row["human_cool"] == "1" ? "cool" : "not_cool"
    total += 1
    matches += 1 if alg_label == human_label
  end
  total > 0 ? (matches.to_f / total) : 0.0
end

# ── Baseline ──────────────────────────────────────────────
baseline = agreement(full_scorer, rows, listings_by_release)

puts "=== Ablation Analysis ==="
puts
puts "Store: #{store.name} (#{store.discogs_username})"
puts "Records with matches: #{listings_by_release.size}"
puts
puts "Baseline agreement (full scorer): #{ (baseline * 100).round(1) }%"
puts

printf "%-20s %12s %12s\n", "Strategy Removed", "Agreement", "Δ from Baseline"
puts "-" * 48

STRATEGIES.each do |strategy|
  scorer = build_scorer(store.id, omit_strategy: strategy)
  ag = agreement(scorer, rows, listings_by_release)
  delta = ag - baseline
  dir = delta > 0 ? "↑" : (delta < 0 ? "↓" : " ")
  printf "%-20s %11.1f%% %s%+.2f%%\n", "− #{strategy}", ag * 100, dir, delta * 100
end

puts
puts "Interpretation:"
puts "  ↑ Positive Δ = removing this strategy INCREASES agreement"
puts "    → strategy may be harmful or needs recalibration"
puts "  ↓ Negative Δ = removing this strategy DECREASES agreement"
puts "    → strategy is contributing useful signal"
