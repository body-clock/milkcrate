#!/usr/bin/env ruby
# analyze.rb — Cross-crate pattern analysis.
#
# Reads ALL experiment crates with results.json files, merges the data,
# and finds:
#   1. High-scoring junk records — the algorithm's worst mistakes
#   2. Low-scoring cool records — the algorithm's biggest misses
#   3. Common strategy patterns across edge cases

require "json"

EXPERIMENTS_DIR = File.join(__dir__, "..", "experiments")

# ── Load all labeled data across crates ─────────────────

crates = Dir.glob(File.join(EXPERIMENTS_DIR, "*/results.json")).map do |results_path|
  crate_dir = File.dirname(results_path)
  crate_name = File.basename(crate_dir)
  seed_path = File.join(crate_dir, "seed.json")

  next nil unless File.exist?(seed_path)

  seed = JSON.parse(File.read(seed_path))
  results = JSON.parse(File.read(results_path))
  seed_by_pos = seed.each_with_object({}) { |r, h| h[r["position"]] = r }

  labeled = results.filter_map do |r|
    entry = seed_by_pos[r["position"]]
    entry&.merge("label" => r["label"], "crate" => crate_name)
  end

  { crate: crate_name, labeled: }
end.compact

all_labeled = crates.flat_map { |c| c[:labeled] }
abort "No labeled records found across any crates." if all_labeled.empty?

puts "=" * 70
puts "CROSS-CRATE ANALYSIS"
puts "=" * 70
puts
puts "Crates analyzed: #{crates.map { |c| c[:crate] }.join(", ")}"
puts "Total labeled:   #{all_labeled.size}"
puts

# ── Aggregate stats ─────────────────────────────────────

labels = all_labeled.group_by { |r| r["label"] }
%w[junk indifferent cool].each do |label|
  next unless labels[label]
  scores = labels[label].map { |r| r["algorithm_score"] }
  min = scores.min
  max = scores.max
  mean = scores.sum / scores.size
  puts "  %-12s n=%-3d  mean=%+.2f  range=[%+.2f, %+.2f]" % [ label, scores.size, mean, min, max ]
end
puts

# ── 1. High-scoring junk records ────────────────────────

junk = labels["junk"] || []
high_junk = junk.sort_by { |r| -r["algorithm_score"] }

puts "=" * 70
puts "HIGH-SCORING JUNK (algorithm's worst mistakes)"
puts "Junk records with the highest algorithm scores — why did it think these were good?"
puts "=" * 70
puts

if high_junk.empty?
  puts "  (none — no records labeled junk across any crate)"
  puts
else
  high_junk.first(15).each_with_index do |r, i|
    score = r["algorithm_score"]
    breakdown = r["score_breakdown"] || {}

    puts "#{i + 1}. [#{r["crate"]}] #{r["artist"]} — #{r["title"]}"
    puts "   Score: #{format("%+.2f", score)}"
    puts "   #{r["year"] && r["year"] > 0 ? r["year"] : "?"}  |  #{Array(r["genres"]).first || "?"}  |  #{r["condition"]}  |  $#{r["price"]}"

    unless breakdown.empty?
      contribs = breakdown.sort_by { |_, v| -v.abs }
      puts "   Score breakdown:"
      contribs.each do |strat, val|
        puts "     %-20s %+.2f" % [ strat, val ]
      end
    end
    puts
  end
end

# ── 2. Low-scoring cool records ─────────────────────────

cool = labels["cool"] || []
low_cool = cool.sort_by { |r| r["algorithm_score"] }

puts "=" * 70
puts "LOW-SCORING COOL (algorithm's biggest misses)"
puts "Cool records with the lowest algorithm scores — what did the algorithm miss?"
puts "=" * 70
puts

if low_cool.empty?
  puts "  (none — no records labeled cool across any crate)"
  puts
else
  low_cool.first(15).each_with_index do |r, i|
    score = r["algorithm_score"]
    breakdown = r["score_breakdown"] || {}

    puts "#{i + 1}. [#{r["crate"]}] #{r["artist"]} — #{r["title"]}"
    puts "   Score: #{format("%+.2f", score)}"
    puts "   #{r["year"] && r["year"] > 0 ? r["year"] : "?"}  |  #{Array(r["genres"]).first || "?"}  |  #{r["condition"]}  |  $#{r["price"]}"

    unless breakdown.empty?
      contribs = breakdown.sort_by { |_, v| -v.abs }
      puts "   Score breakdown:"
      contribs.each do |strat, val|
        puts "     %-20s %+.2f" % [ strat, val ]
      end
    end
    puts
  end
end

# ── 3. Strategy pattern analysis ────────────────────────

puts "=" * 70
puts "STRATEGY PATTERNS"
puts "What strategies dominate high-junk vs low-cool?"
puts "=" * 70
puts

top_junk = high_junk.first(10)
top_cool = low_cool.first(10)

if top_junk.any? && top_cool.any?
  # Collect all strategy names
  all_strategies = (top_junk.flat_map { |r| (r["score_breakdown"] || {}).keys } +
                    top_cool.flat_map { |r| (r["score_breakdown"] || {}).keys }).uniq

  puts "Average contribution for TOP 10 HIGH-JUNK:"
  puts "-" * 50
  all_strategies.each do |strat|
    vals = top_junk.map { |r| (r["score_breakdown"] || {})[strat] || 0 }
    avg = vals.sum / vals.size
    puts "  %-20s %+.2f" % [ strat, avg ]
  end
  puts

  puts "Average contribution for TOP 10 LOW-COOL:"
  puts "-" * 50
  all_strategies.each do |strat|
    vals = top_cool.map { |r| (r["score_breakdown"] || {})[strat] || 0 }
    avg = vals.sum / vals.size
    puts "  %-20s %+.2f" % [ strat, avg ]
  end
  puts

  puts "Gap (high-junk minus low-cool): positive = strategy is pushing junk UP"
  puts "-" * 50
  all_strategies.each do |strat|
    junk_avg = top_junk.map { |r| (r["score_breakdown"] || {})[strat] || 0 }.sum / top_junk.size
    cool_avg = top_cool.map { |r| (r["score_breakdown"] || {})[strat] || 0 }.sum / top_cool.size
    gap = junk_avg - cool_avg
    arrow = gap > 0 ? "↑ over-boosts junk" : gap < 0 ? "↓ under-boosts cool" : "—"
    puts "  %-20s %+.2f  %s" % [ strat, gap, arrow ]
  end
  puts
else
  puts "  Not enough data to compare patterns (need both high-junk and low-cool records)."
  puts
end

# ── Summary ──────────────────────────────────────────────
total_junk = junk.size
total_cool = cool.size
indiff = (labels["indifferent"] || []).size

puts "=" * 70
puts "SUMMARY"
puts "=" * 70
puts
puts "  Total labeled: #{all_labeled.size}"
puts "  Cool (#{total_cool})   Junk (#{total_junk})   Indifferent (#{indiff})"
puts

if top_junk.any?
  puts "  Biggest algorithm failure: #{top_junk.first["artist"]} — #{top_junk.first["title"]}"
  puts "    (score #{top_junk.first["algorithm_score"].round(2)} you said junk)"
end
puts

if top_cool.any?
  puts "  Biggest algorithm miss:   #{top_cool.first["artist"]} — #{top_cool.first["title"]}"
  puts "    (score #{top_cool.first["algorithm_score"].round(2)} you said cool)"
end
