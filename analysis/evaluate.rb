#!/usr/bin/env ruby
# evaluate.rb — Score a labeled crate against the algorithm and register results.
#
# Usage:
#   ruby analysis/evaluate.rb experiments/crate-001/results.csv [version_label]
#
# Computes agreement metrics (accuracy, precision, recall, F1) between
# algorithm prediction and human labels. Appends to the score registry
# at experiments/score-registry.yml with date, crate name, accuracy,
# version label, and notes.
#
# Also computes "before" accuracy if a previous registry entry exists
# and reports Δ.

require "csv"
require "yaml"
require "fileutils"
require "date"

abort "Usage: ruby analysis/evaluate.rb <results.csv> [version_label]" unless ARGV[0]
abort "File not found: #{ARGV[0]}" unless File.exist?(ARGV[0])

csv_path  = ARGV[0]
version   = ARGV[1] || "baseline"
crate_dir = File.dirname(csv_path)
crate_name = File.basename(crate_dir)

rows = CSV.read(csv_path, headers: true)

# ── Metrics ────────────────────────────────────────────────
THRESHOLD = 1.0  # warm_threshold

labeled = rows.select { |r| r["human_label"] && !r["human_label"].empty? }
abort "No labeled records found in #{csv_path}" if labeled.empty?

tp = tn = fp = fn = 0

labeled.each do |r|
  score  = r["algorithm_score"].to_f
  alg    = score >= THRESHOLD ? "cool" : "not_cool"
  human  = r["human_cool"] == "1" ? "cool" : "not_cool"

  if human == "cool" && alg == "cool"
    tp += 1
  elsif human == "cool" && alg == "not_cool"
    fn += 1
  elsif human == "not_cool" && alg == "cool"
    fp += 1
  else
    tn += 1
  end
end

total     = tp + tn + fp + fn
accuracy  = total > 0 ? (tp + tn).to_f / total : 0.0
precision = (tp + fp) > 0 ? tp.to_f / (tp + fp) : 0.0
recall    = (tp + fn) > 0 ? tp.to_f / (tp + fn) : 0.0
f1        = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0.0

# ── Registry ──────────────────────────────────────────────
registry_path = File.join(Dir.pwd, "experiments", "score-registry.yml")

# Load existing registry
registry = if File.exist?(registry_path)
  YAML.load_file(registry_path) || []
else
  []
end
registry = [ registry ] unless registry.is_a?(Array)

# Find previous entry for Δ calculation
previous = registry.last

entry = {
  "date"             => Date.today.to_s,
  "crate"            => crate_name,
  "version"          => version,
  "records_labeled"  => labeled.size,
  "accuracy"         => accuracy.round(4),
  "precision"        => precision.round(4),
  "recall"           => recall.round(4),
  "f1"               => f1.round(4),
  "tp"               => tp,
  "tn"               => tn,
  "fp"               => fp,
  "fn"               => fn
}

if previous
  entry["delta_accuracy"] = (accuracy - previous["accuracy"]).round(4)
end

registry << entry

FileUtils.mkdir_p(File.dirname(registry_path))
File.write(registry_path, registry.to_yaml)

# ── Output ────────────────────────────────────────────────
puts "=== Evaluation: #{crate_name} ==="
puts
puts "Date:    #{entry["date"]}"
puts "Version: #{version}"
puts "Records: #{labeled.size} labeled"
puts
puts "Confusion Matrix (threshold >= #{THRESHOLD}):"
puts "  TP: #{tp}  FP: #{fp}"
puts "  FN: #{fn}  TN: #{tn}"
puts
puts "Accuracy:  #{(accuracy * 100).round(1)}%"
puts "Precision: #{(precision * 100).round(1)}%"
puts "Recall:    #{(recall * 100).round(1)}%"
puts "F1:        #{f1.round(4)}"

if previous
  delta = entry["delta_accuracy"]
  dir = delta >= 0 ? "↑" : "↓"
  puts
  puts "Δ from previous (#{previous["version"]}): #{dir}#{(delta * 100).round(1)}%"
end

puts
puts "Score registry updated: #{registry_path}"
