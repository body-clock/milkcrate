#!/usr/bin/env ruby
# seams.rb — Confusion matrix, false positive/negative enumeration,
# and counterfactual analysis.
#
# Usage: ruby analysis/seams.rb <results.csv>
#
# Builds a confusion matrix for algorithm_label vs human_label, enumerates
# error records, and for each error determines which single strategy change
# would flip the algorithm result.

require "csv"

abort "Usage: ruby analysis/seams.rb <results.csv>" unless ARGV[0]
abort "File not found: #{ARGV[0]}" unless File.exist?(ARGV[0])

rows = CSV.read(ARGV[0], headers: true)

# ── Classification ────────────────────────────────────────
# Use binary: algorithm score >= warm_threshold → "cool", else "not_cool"
THRESHOLD = 1.0  # warm_threshold from settings

def alg_label(score)
  score >= THRESHOLD ? "cool" : "not_cool"
end

def human_label(row)
  row["human_cool"] == "1" ? "cool" : "not_cool"
end

# ── Confusion matrix ──────────────────────────────────────
#               Predicted
#               cool   not_cool
# Actual cool    TP       FN
# Actual not     FP       TN

tp = 0; tn = 0; fp = 0; fn = 0
false_positives = []
false_negatives = []

rows.each do |r|
  score = r["algorithm_score"].to_f
  alg   = alg_label(score)
  hum   = human_label(r)

  if hum == "cool" && alg == "cool"
    tp += 1
  elsif hum == "cool" && alg == "not_cool"
    fn += 1
    false_negatives << r
  elsif hum == "not_cool" && alg == "cool"
    fp += 1
    false_positives << r
  else
    tn += 1
  end
end

total = tp + tn + fp + fn
accuracy = total > 0 ? (tp + tn).to_f / total : 0.0
precision = (tp + fp) > 0 ? tp.to_f / (tp + fp) : 0.0
recall = (tp + fn) > 0 ? tp.to_f / (tp + fn) : 0.0
f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0.0

puts "=== Confusion Matrix ==="
puts
puts "Threshold: score >= #{THRESHOLD} → 'cool'"
puts
puts "                     Predicted"
puts "                   cool    not_cool"
puts "  Actual cool      #{tp.to_s.rjust(4)}    #{fn.to_s.rjust(4)}"
puts "  Actual not_cool  #{fp.to_s.rjust(4)}    #{tn.to_s.rjust(4)}"
puts
puts "Accuracy:  #{(accuracy * 100).round(1)}%"
puts "Precision: #{(precision * 100).round(1)}%"
puts "Recall:    #{(recall * 100).round(1)}%"
puts "F1 Score:  #{f1.round(3)}"

# ── Error records ─────────────────────────────────────────
puts
puts "=== False Positives (algo says cool, human says not) ==="
puts "  (#{fp} records)"
puts
false_positives.first(5).each do |r|
  puts "  #{r["artist"]} — #{r["title"]}"
  puts "    Score: #{r["algorithm_score"]}  |  Band: #{r["band"]}  |  Human: #{r["human_label"]}"
  puts "    Genres: #{r["genres"]}  |  Year: #{r["year"]}  |  Cond: #{r["condition"]}"
  absence_flags = %w[year_absent genres_absent styles_absent condition_absent label_absent cover_absent]
    .select { |f| r[f] == "true" }
  puts "    Absent: #{absence_flags.join(", ")}" if absence_flags.any?
  puts
end
puts "  … and #{fp - 5} more" if fp > 5

puts
puts "=== False Negatives (algo says not cool, human says cool) ==="
puts "  (#{fn} records)"
puts
false_negatives.first(5).each do |r|
  puts "  #{r["artist"]} — #{r["title"]}"
  puts "    Score: #{r["algorithm_score"]}  |  Band: #{r["band"]}  |  Human: #{r["human_label"]}"
  puts "    Genres: #{r["genres"]}  |  Year: #{r["year"]}  |  Cond: #{r["condition"]}"
  absence_flags = %w[year_absent genres_absent styles_absent condition_absent label_absent cover_absent]
    .select { |f| r[f] == "true" }
  puts "    Absent: #{absence_flags.join(", ")}" if absence_flags.any?
  puts
end
puts "  … and #{fn - 5} more" if fn > 5

# ── Counterfactuals ───────────────────────────────────────
puts "=== Per-Error Counterfactuals ==="
puts
puts "For each error record, the minimum score increase needed to flip:"

all_errors = false_positives + false_negatives
all_errors.first(10).each do |r|
  score = r["algorithm_score"].to_f
  if r["human_label"] == "cool"
    # False negative: need to increase score to reach THRESHOLD
    gap = [ THRESHOLD - score, 0 ].max
    puts "  #{r["artist"]} — #{r["title"]}"
    puts "    Score #{score.round(2)} → needs +#{gap.round(2)} to reach threshold #{THRESHOLD}"
  else
    # False positive: already above threshold
    gap = score - THRESHOLD
    puts "  #{r["artist"]} — #{r["title"]}"
    puts "    Score #{score.round(2)} → exceeds threshold by #{gap.round(2)} (should be < #{THRESHOLD})"
  end
end
puts "  … and #{all_errors.size - 10} more" if all_errors.size > 10
