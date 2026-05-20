#!/usr/bin/env ruby
# anti_scorer.rb — Logistic regression with inverted target (junk=1).
#
# Usage: ruby analysis/anti_scorer.rb <results.csv>
#
# Fits the same logistic regression model but with junk=1, cool/indifferent=0.
# Produces a dual-coefficient table comparing cool-predictor vs junk-predictor
# to assess discrimination — which features push records toward each label.

require "csv"

abort "Usage: ruby analysis/anti_scorer.rb <results.csv>" unless ARGV[0]
abort "File not found: #{ARGV[0]}" unless File.exist?(ARGV[0])

rows = CSV.read(ARGV[0], headers: true)

# Use algorithm_score as the single feature
scores = rows.map { |r| r["algorithm_score"].to_f }
labels_cool = rows.map { |r| r["human_cool"].to_i }
labels_junk = rows.map { |r| r["human_label"] == "junk" ? 1 : 0 }

# ── Helpers ───────────────────────────────────────────────
def mean(arr) = arr.sum.to_f / arr.size
def stdev(arr)
  m = mean(arr)
  Math.sqrt(arr.map { |x| (x - m) ** 2 }.sum / (arr.size - 1))
end
def sigmoid(z)
  z = [ [ z, -50 ].max, 50 ].min
  1.0 / (1.0 + Math.exp(-z))
end
def pearson(xs, ys)
  n = xs.size
  mx, my = mean(xs), mean(ys)
  num = xs.zip(ys).sum { |x, y| (x - mx) * (y - my) }
  den = Math.sqrt(xs.sum { |x| (x - mx) ** 2 } * ys.sum { |y| (y - my) ** 2 })
  den.zero? ? 0.0 : num / den
end

# ── Simple logistic regression ────────────────────────────
def fit_lr(xs, ys, epochs: 2000, lr: 0.1)
  x_mean = mean(xs)
  x_std  = stdev(xs)
  x_std  = 1.0 if x_std.zero?
  x_norm = xs.map { |x| (x - x_mean) / x_std }

  w0, w1 = 0.0, 0.0
  n = xs.size

  epochs.times do
    grad0, grad1 = 0.0, 0.0
    n.times do |i|
      h = sigmoid(w0 + w1 * x_norm[i])
      err = h - ys[i]
      grad0 += err
      grad1 += err * x_norm[i]
    end
    w0 -= lr * grad0 / n
    w1 -= lr * grad1 / n
  end

  # Convert back to original scale
  intercept = w0 - w1 * x_mean / x_std
  coeff = w1 / x_std
  [ intercept, coeff ]
end

# ── Fit both models ───────────────────────────────────────
cool_intercept, cool_coeff = fit_lr(scores, labels_cool)
junk_intercept, junk_coeff = fit_lr(scores, labels_junk)

# ── Discrimination assessment ─────────────────────────────
WARM_THRESHOLD = 1.0
# Compare agreement rates
cool_agreement = scores.zip(labels_cool).count { |s, l| (s >= WARM_THRESHOLD) == (l == 1) }.to_f / scores.size
junk_agreement = scores.zip(labels_junk).count { |s, l| (s < WARM_THRESHOLD) == (l == 1) }.to_f / scores.size

puts "=== Anti-Scorer Analysis ==="
puts
puts "Records: #{scores.size} (#{labels_cool.count(1)} cool, #{labels_junk.count(1)} junk)"
puts

puts "Dual-Coefficient Table:"
puts

printf "%-20s %12s %12s %12s %12s\n", "", "Intercept", "Score Coef", "Pearson r", "Agree. Rate"
puts "-" * 72
printf "%-20s %12.4f %12.4f %12.4f %11.1f%%\n",
  "cool-predictor",
  cool_intercept,
  cool_coeff,
  pearson(scores, labels_cool.map(&:to_f)),
  cool_agreement * 100
printf "%-20s %12.4f %12.4f %12.4f %11.1f%%\n",
  "junk-predictor",
  junk_intercept,
  junk_coeff,
  pearson(scores, labels_junk.map(&:to_f)),
  junk_agreement * 100

puts
puts "=== Discrimination Assessment ==="
puts
puts "Algorithm score distribution by label:"
%w[cool indifferent junk].each do |label|
  subset = rows.select { |r| r["human_label"] == label }
  next if subset.empty?
  vals = subset.map { |r| r["algorithm_score"].to_f }
  puts "  #{label.ljust(12)} n=#{vals.size}  mean=#{mean(vals).round(2)}  min=#{vals.min.round(2)}  max=#{vals.max.round(2)}"
end

# Separation quality
cool_scores = rows.select { |r| r["human_label"] == "cool" }.map { |r| r["algorithm_score"].to_f }
junk_scores = rows.select { |r| r["human_label"] == "junk" }.map { |r| r["algorithm_score"].to_f }

if cool_scores.any? && junk_scores.any?
  cool_mean = mean(cool_scores)
  junk_mean = mean(junk_scores)
  separation = cool_mean - junk_mean
  puts
  puts "Mean separation (cool − junk): #{separation.round(2)}"
  if separation > 0
    puts "  ✓ Algorithm scores are directionally aligned with human labels"
  else
    puts "  ✗ Algorithm scores are INVERTED vs human labels — urgent recalibration needed"
  end
end

puts
puts "Interpretation:"
puts "  cool-predictor:  positive coefficient → higher scores predict 'cool'"
puts "  junk-predictor:  negative coefficient → lower scores predict 'junk'"
puts "  Strong, opposite coefficients = good discrimination"
