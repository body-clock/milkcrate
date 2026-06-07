# frozen_string_literal: true

# Classifies Discogs styles for a narrow-catalog store into four tiers:
# main, rotation, suppressed, and omitted. Computed once per curation
# instance from eligible listings and consumed by StylesAxis for crate
# allocation, display ordering, and thematic candidate filtering.
class StyleSelection
  # Percentage of eligible listings required for a style to qualify as main.
  MAIN_THRESHOLD = 0.05
  # Percentage of eligible listings required for a rotation candidate.
  ROTATION_THRESHOLD = 0.01
  # Minimum share of overlapping non-broad listings needed to suppress a broad style.
  SUPPRESSION_RATIO = 0.75

  # Curated set of broad Discogs style names that may be suppressed when
  # redundant with more specific styles. This list is intentionally small
  # and documented; seller customization is deferred to follow-up work.
  BROAD_STYLES = %w[
    Blues\ Rock
    Classic\ Rock
    Hard\ Rock
    Pop\ Rock
    Rock\ &\ Roll
  ].freeze

  attr_reader :total_listings

  # listings - Array of Listing objects eligible for the current curation.
  def initialize(listings)
    @listings = listings
    @total_listings = listings.size.to_f
  end

  # Deduplicated style → count, normalized per listing (one contribution max).
  def support
    @support ||= build_support
  end

  # Styles that meet the main threshold and are not suppressed broad labels.
  def main_styles
    @main_styles ||= support.select { |name, count|
      count >= main_floor && count >= main_threshold && !suppressed?(name)
    }.keys.sort
  end

  # Map of main style name → overlap risk (share of its listings also
  # tagged with a higher-support main style). Used for allocation ordering.
  def overlap_risk
    @overlap_risk ||= compute_overlap_risk
  end

  # Allocation order for main styles: highest overlap risk first, then
  # lowest support, then name (stable tie-breaker).
  def allocation_order
    @allocation_order ||= main_styles.sort_by { |name|
      [-overlap_risk.fetch(name, 0), support.fetch(name, 0), name]
    }
  end

  # Display order: highest support first, then name.
  def display_order
    @display_order ||= main_styles.sort_by { |name|
      [-support.fetch(name, 0), name]
    }
  end

  # Main style counts (suppressed and omitted styles excluded).
  def main_counts
    @main_counts ||= main_styles.each_with_object({}) { |name, h|
      h[name] = support.fetch(name, 0)
    }
  end

  # Rotation-tier style names (non-main, non-suppressed, non-omitted).
  def rotation_styles
    @rotation_styles ||= support.select { |name, count|
      next false if main_styles.include?(name)
      next false if suppressed?(name)
      count >= rotation_floor && count >= rotation_threshold
    }.keys.sort
  end

  private

  def build_support
    counts = Hash.new(0)
    @listings.each do |listing|
      Array(listing.styles).compact.uniq.each { |style| counts[style] += 1 }
    end
    counts
  end

  # Non-broad styles that meet the rotation threshold (before suppression
  # is applied). Used as the "qualifying" set for broad-style suppression.
  def qualifying_non_broad_styles
    @qualifying_non_broad_styles ||= support.select { |name, count|
      next false if BROAD_STYLES.include?(name)
      count >= rotation_floor && count >= rotation_threshold
    }.keys
  end

  def suppressed?(name)
    suppressed_styles.include?(name)
  end

  def suppressed_styles
    @suppressed_styles ||= compute_suppressed
  end

  def compute_suppressed
    return Set.new if qualifying_non_broad_styles.empty?

    BROAD_STYLES.each_with_object(Set.new) do |broad, set|
      broad_count = support[broad]
      next if broad_count.nil? || broad_count.zero?

      overlap_count = count_broad_overlap(broad)
      next if overlap_count.to_f / broad_count < SUPPRESSION_RATIO

      set.add(broad)
    end
  end

  def count_broad_overlap(broad)
    @listings.count do |listing|
      styles = Array(listing.styles).compact
      next false unless styles.include?(broad)

      (styles & qualifying_non_broad_styles).any?
    end
  end

  def compute_overlap_risk
    ordered = main_styles.sort_by { |name| [-support.fetch(name, 0), name] }
    risks = {}

    ordered.each_with_index do |style, idx|
      higher = ordered[0...idx]
      next if higher.empty?

      style_listings = listings_with_style(style)
      next if style_listings.empty?

      overlap_count = style_listings.count { |l|
        (Array(l.styles).compact & higher).any?
      }
      risks[style] = overlap_count.to_f / style_listings.size
    end

    risks
  end

  def listings_with_style(style)
    @listings.select { |l| Array(l.styles).compact.include?(style) }
  end

  def main_floor
    CuratedCrate::MIN_RECORDS
  end

  def rotation_floor
    CuratedCrate::MIN_RECORDS
  end

  def main_threshold
    (total_listings * MAIN_THRESHOLD).ceil
  end

  def rotation_threshold
    (total_listings * ROTATION_THRESHOLD).ceil
  end
end
