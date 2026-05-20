#!/usr/bin/env ruby
# absence_profile.rb — Conditional probability analysis of metadata absence.
#
# Usage: ruby analysis/absence_profile.rb <results.csv>
#
# For each nullable field, computes P(junk | absent) vs P(junk | present)
# and builds a cumulative sparsity model showing how missing metadata
# correlates with human labels.

require "csv"

abort "Usage: ruby analysis/absence_profile.rb <results.csv>" unless ARGV[0]
abort "File not found: #{ARGV[0]}" unless File.exist?(ARGV[0])

rows = CSV.read(ARGV[0], headers: true)

# Fields to analyze
ABSENCE_FIELDS = %w[year_absent genres_absent styles_absent condition_absent label_absent cover_absent want_have_absent]

puts "=== Metadata Absence Profile ==="
puts
puts "Records: #{rows.size}"
puts

# ── Per-field analysis ────────────────────────────────────
puts "Per-field conditional probabilities:"
puts

printf "%-20s %6s %8s %8s %8s %8s %8s\n",
  "Field", "Absent", "P(junk|A)", "P(cool|A)", "P(junk|P)", "P(cool|P)", "ΔP(junk)"
puts "-" * 72

ABSENCE_FIELDS.each do |field|
  absent_rows  = rows.select { |r| r[field] == "true" }
  present_rows = rows.select { |r| r[field] != "true" }

  absent_count  = absent_rows.size
  present_count = present_rows.size

  next if absent_count == 0 && present_count == 0

  p_junk_absent  = absent_count > 0  ? absent_rows.count { |r| r["human_label"] == "junk" }.to_f / absent_count : 0.0
  p_cool_absent  = absent_count > 0  ? absent_rows.count { |r| r["human_label"] == "cool" }.to_f / absent_count : 0.0
  p_junk_present = present_count > 0 ? present_rows.count { |r| r["human_label"] == "junk" }.to_f / present_count : 0.0
  p_cool_present = present_count > 0 ? present_rows.count { |r| r["human_label"] == "cool" }.to_f / present_count : 0.0

  delta = p_junk_absent - p_junk_present

  printf "%-20s %6d %7.1f%% %7.1f%% %7.1f%% %7.1f%% %+7.1f%%\n",
    field.sub("_absent", ""),
    absent_count,
    p_junk_absent * 100,
    p_cool_absent * 100,
    p_junk_present * 100,
    p_cool_present * 100,
    delta * 100
end

# ── Cumulative sparsity model ─────────────────────────────
puts
puts "=== Cumulative Sparsity Model ==="
puts

# Count how many absence flags each record has
sparsity_counts = rows.map do |r|
  ABSENCE_FIELDS.count { |f| r[f] == "true" }
end

puts "Sparsity distribution:"
(0..ABSENCE_FIELDS.size).each do |n|
  subset = rows.each_with_index.select { |_, i| sparsity_counts[i] == n }.map(&:first)
  next if subset.empty?
  p_junk = subset.count { |r| r["human_label"] == "junk" }.to_f / subset.size
  p_cool = subset.count { |r| r["human_label"] == "cool" }.to_f / subset.size
  p_diff = subset.count { |r| r["human_label"] == "indifferent" }.to_f / subset.size
  bar = "█" * (subset.size / 2)  # rough visual
  puts "  #{n} flags: n=#{subset.size.to_s.rjust(3)}  junk=#{(p_junk*100).round(1)}%  cool=#{(p_cool*100).round(1)}%  indifferent=#{(p_diff*100).round(1)}%  #{bar}"
end

# ── Sparsity vs algorithm score ───────────────────────────
puts
puts "=== Sparsity vs Algorithm Score ==="
puts

(0..ABSENCE_FIELDS.size).each do |n|
  subset = rows.each_with_index.select { |_, i| sparsity_counts[i] == n }.map(&:first)
  next if subset.empty?
  scores = subset.map { |r| r["algorithm_score"].to_f }
  mean_score = scores.sum / scores.size
  puts "  #{n} flags: mean score = #{mean_score.round(2)}  (n=#{subset.size})"
end

puts
puts "Interpretation:"
puts "  ΔP(junk) = P(junk | absent) − P(junk | present)"
puts "  Positive Δ → absence correlates with junk labels"
puts "  Negative Δ → absence correlates with non-junk labels (field may be irrelevant)"
