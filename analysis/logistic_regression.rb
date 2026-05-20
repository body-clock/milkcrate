#!/usr/bin/env ruby
# logistic_regression.rb — Logistic regression of strategy scores vs human labels.
#
# Usage: ruby analysis/logistic_regression.rb <results.csv>
#
# Fits a logistic regression model on the 8 strategy scores (computed by
# RecordScorer) against the binary target: cool=1, junk/indifferent=0.
# Uses gradient descent to produce coefficients, standard errors, and
# suggested weight recalibration.
#
# Run from project root for Rails model access:
#   ruby -I app analysis/logistic_regression.rb experiments/crate-001/results.csv

require "csv"

abort "Usage: ruby analysis/logistic_regression.rb <results.csv>" unless ARGV[0]
abort "File not found: #{ARGV[0]}" unless File.exist?(ARGV[0])

# ── Load data ──────────────────────────────────────────────
rows = CSV.read(ARGV[0], headers: true)

# The merge script populates algorithm_score. Strategy breakdowns
# require re-scoring with RecordScorer. Detect if we have strategy scores.
# If not, compute them.
csv_headers = rows.headers

# Check if we have per-strategy columns (from ablation runs) or just algorithm_score
has_strategies = csv_headers.any? { |h| h.start_with?("strategy_") }

features = if has_strategies
  # Load from per-strategy columns written by ablation or merge
  strategy_cols = csv_headers.select { |h| h.start_with?("strategy_") }
  rows.map do |r|
    strategy_cols.map { |c| r[c].to_f }
  end
else
  # Use only algorithm_score as a single feature (users run from merge output first)
  # Re-scoring with per-strategy breakdowns requires Rails; use correlation instead
  puts "=== Note: Only algorithm_score available as feature. ==="
  puts "=== Re-run merge with Rails loaded for per-strategy breakdowns. ==="
  rows.map { |r| [ r["algorithm_score"].to_f ] }
end

labels = rows.map { |r| r["human_cool"].to_i }
names  = has_strategies ? csv_headers.select { |h| h.start_with?("strategy_") } : [ "algorithm_score" ]

# ── Statistics helpers ─────────────────────────────────────
def mean(arr)
  arr.sum.to_f / arr.size
end

def stdev(arr)
  m = mean(arr)
  Math.sqrt(arr.map { |x| (x - m) ** 2 }.sum / (arr.size - 1))
end

def pearson(xs, ys)
  n = xs.size
  mx = mean(xs)
  my = mean(ys)
  num = xs.zip(ys).sum { |x, y| (x - mx) * (y - my) }
  den = Math.sqrt(xs.sum { |x| (x - mx) ** 2 } * ys.sum { |y| (y - my) ** 2 })
  den.zero? ? 0.0 : num / den
end

# ── Logistic regression via gradient descent ───────────────
# X: n×m matrix (n records, m features)
# y: n-vector of 0/1 labels
# Returns { coefficients: [], convergence: bool }

def sigmoid(z)
  z = [ [ z, -50 ].max, 50 ].min  # prevent overflow
  1.0 / (1.0 + Math.exp(-z))
end

def log_loss(x, y, theta)
  n = x.size
  sum = 0.0
  n.times do |i|
    h = sigmoid(x[i].zip(theta).sum { |xi, ti| xi * ti })
    sum += -y[i] * Math.log([ h, 1e-10 ].max) - (1 - y[i]) * Math.log([ 1 - h, 1e-10 ].max)
  end
  sum / n
end

def logistic_regression(x, y, lr: 0.01, epochs: 5000, tol: 1e-6)
  n = x.size
  m = x.first.size
  theta = Array.new(m, 0.0)
  prev_loss = Float::INFINITY

  epochs.times do |epoch|
    # Gradient computation
    grad = Array.new(m, 0.0)
    n.times do |i|
      h = sigmoid(x[i].zip(theta).sum { |xi, ti| xi * ti })
      err = h - y[i]
      m.times { |j| grad[j] += err * x[i][j] }
    end
    m.times { |j| grad[j] /= n }

    # Update
    m.times { |j| theta[j] -= lr * grad[j] }

    # Convergence check (every 100 epochs)
    if epoch % 100 == 0
      loss = log_loss(x, y, theta)
      break if (prev_loss - loss).abs < tol
      prev_loss = loss
    end
  end

  theta
end

# ── Standardize features (z-score) ─────────────────────────
def standardize(matrix)
  n = matrix.size
  m = matrix.first.size
  means = Array.new(m) { |j| mean(matrix.map { |r| r[j] }) }
  stds  = Array.new(m) { |j| s = stdev(matrix.map { |r| r[j] }); s.zero? ? 1.0 : s }

  standardized = matrix.map do |row|
    row.each_with_index.map { |v, j| (v - means[j]) / stds[j] }
  end

  [ standardized, means, stds ]
end

# ── Fit model ──────────────────────────────────────────────
x_std, x_means, x_stds = standardize(features)

# Add intercept column
x_aug = x_std.map { |r| [ 1.0 ] + r }

theta = logistic_regression(x_aug, labels)
intercept = theta[0]
coeffs = theta[1..]

# Convert standardized coefficients back to original scale
# beta_orig_j = beta_std_j / std_j
coeffs_orig = coeffs.each_with_index.map { |b, j| b / x_stds[j] }
# Intercept adjustment: intercept_orig = intercept_std - sum(beta_std_j * mean_j / std_j)
intercept_orig = intercept - coeffs.each_with_index.sum { |b, j| b * x_means[j] / x_stds[j] }

# ── Standard errors via bootstrap ──────────────────────────
n_bootstrap = 100
bootstrap_coeffs = Array.new(names.size) { [] }

n_bootstrap.times do
  # Sample with replacement
  indices = Array.new(labels.size) { rand(labels.size) }
  bx = indices.map { |i| features[i] }
  by = indices.map { |i| labels[i] }

  bx_std, _, _ = standardize(bx)
  bx_aug = bx_std.map { |r| [ 1.0 ] + r }
  bt = logistic_regression(bx_aug, by, epochs: 1000)

  bt_coeffs = bt[1..]
  names.size.times { |j| bootstrap_coeffs[j] << bt_coeffs[j] }
end

# ── Output ─────────────────────────────────────────────────
puts "=== Logistic Regression Coefficient Table ==="
puts
puts "Target: human_cool (cool=1, junk/indifferent=0)"
puts "Records: #{labels.size} (#{labels.count(1)} cool, #{labels.count(0)} not-cool)"
puts

printf "%-22s %10s %10s %10s %10s\n", "Feature", "Coef", "StdErr", "Z-score", "Pearson r"
puts "-" * 72

names.each_with_index do |name, j|
  coeff = coeffs_orig[j]
  se    = stdev(bootstrap_coeffs[j])
  z     = se.zero? ? 0.0 : (coeff / se).abs
  r     = pearson(features.map { |f| f[j] }, labels.map(&:to_f))

  printf "%-22s %10.4f %10.4f %10.2f %10.4f\n", name, coeff, se, z, r
end

puts "-" * 72
printf "%-22s %10.4f\n", "(Intercept)", intercept_orig
puts
puts "=== Suggested Weight Recalibration ==="
puts
puts "These coefficients represent the logistic regression's estimate of each"
puts "feature's contribution to P(cool). Larger positive coefficients mean the"
puts "feature strongly predicts 'cool' labels. Consider adjusting RecordScorer"
puts "weights toward these proportions."
puts

# Normalize positive coefficients as suggested recalibration
pos_coeffs = coeffs_orig.map { |c| [ c, 0.0 ].max }
total = pos_coeffs.sum
if total > 0
  names.each_with_index do |name, j|
    pct = (pos_coeffs[j] / total * 100).round(1)
    printf "  %-20s => %5.1f%% of weight budget\n", name + ":", pct
  end
else
  puts "  (No positive coefficients — check data quality)"
end
