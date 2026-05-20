# Analysis Scripts

Plain Ruby analysis scripts for the experiment pipeline. These read a merged
`results.csv` (produced by `merge.rb`) and output findings to stdout.

## Scripts

| Script | Purpose | Requires Rails? |
|--------|---------|----------------|
| `merge.rb` | Merge seed JSON + labeling results → `results.csv` | No |
| `logistic_regression.rb` | Logistic regression of strategy scores vs human cool/junk | No |
| `ablation.rb` | Run RecordScorer omitting one strategy at a time | Yes |
| `anti_scorer.rb` | Invert target (junk=1), dual-coefficient comparison | No |
| `seams.rb` | Confusion matrix, error enumeration, counterfactuals | No |
| `absence_profile.rb` | Conditional probability of junk/cool given metadata absence | No |

## Usage

All scripts accept a path to `results.csv` as their first argument:

```bash
# From project root:
ruby analysis/seams.rb experiments/crate-001/results.csv
```

Scripts that need Rails model access (`ablation.rb`) must be run with the app
load path:

```bash
ruby -I app analysis/ablation.rb experiments/crate-001/results.csv
```

## Output Format

All scripts print to stdout with `=== Section Headers ===` separating logical
sections. Redirect to files for persistence:

```bash
ruby analysis/logistic_regression.rb experiments/crate-001/results.csv > experiments/crate-001/logistic-regression.txt
```
