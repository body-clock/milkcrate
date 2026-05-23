# Price Strategy for Record Scoring

Add a price-based scoring strategy that boosts records priced $10+ by 1 point,
increasing their visibility in crate selections.

## Motivation

Higher-priced records tend to be both more collectible/interesting (curatorial)
and more commercially valuable (revenue). A simple price boost ensures these
records get a modest visibility bump without overwhelming other scoring signals.

## Architecture

### New file: `app/services/score_strategies/price_strategy.rb`

A new strategy class following the exact conventions of the 8 existing strategies:

```ruby
# Boosts records priced $10+ by 1 point. Higher-priced records are both more
# commercially valuable (higher AOV) and tend to be more collectible/interesting,
# making them worth surfacing in crates. This is a pure boost: records under
# the threshold or with no price get 0, not a penalty.
class ScoreStrategies::PriceStrategy
  PRICE_THRESHOLD = 10.00
  PRICE_BOOST = 1.0

  def score(listing)
    listing.price && listing.price >= PRICE_THRESHOLD ? PRICE_BOOST : 0.0
  end
end
```

### Registration

Add `price: ScoreStrategies::PriceStrategy.new` to `RecordScorer.default_strategies`,
placing it after `noise` (the last existing strategy in the hash).

### Behavior

| Price            | Score |
|------------------|-------|
| >= 10.00         | +1.0  |
| < 10.00          | 0.0   |
| nil              | 0.0   |

Binary boost only — no graduated scale, no penalty for cheap records.

### Testing

- `spec/services/score_strategies/price_strategy_spec.rb` following the standard
  strategy test pattern (price above threshold => +1, below => 0, nil => 0,
  exactly at threshold => +1)
- Verify registration in `RecordScorer.default_strategies`

## Edge Cases

- **Price nil** — returns 0.0 (no crash, just no boost)
- **Price = 0.00** — returns 0.0 (not >= 10.00)
- **Price = 10.00** — returns +1.0 (inclusive threshold)
- **Price is a string/other type** — handled by Rails typecasting; the decimal
  column ensures `listing.price` is a BigDecimal or nil

## Impact

Max score increase: +1.0 per listing. This is moderate — comparable to the
VintageStrategy bonus (1.0) and smaller than the FreshnessStrategy range (-5 to +3)
or SectionStrategy boost (2). It nudges higher-value inventory upward without
dominating the scoring.
