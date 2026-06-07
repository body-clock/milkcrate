# frozen_string_literal: true

# Classifies Discogs styles for a narrow-catalog store into four tiers:
# main, rotation, suppressed, and omitted. Computed once per curation
# instance from eligible listings and consumed by StylesAxis for crate
# allocation, display ordering, and thematic candidate filtering.
class StyleSelection
  MAIN_THRESHOLD = 0.05
  ROTATION_THRESHOLD = 0.01
  SUPPRESSION_RATIO = 0.75
  MIN_RECORDS = CuratedCrate::MIN_RECORDS

  BROAD_STYLES = %w[
    Blues\ Rock
    Classic\ Rock
    Hard\ Rock
    Pop\ Rock
    Rock\ &\ Roll
  ].freeze

  attr_reader :total_listings

  def initialize(listings)
    @listings = listings
    @total_listings = listings.size.to_f
  end

  def support
    @support ||= build_support
  end

  def main_styles
    @main_styles ||= support.select { |name, count|
      count >= MIN_RECORDS && count >= (total_listings * MAIN_THRESHOLD).ceil && !suppressed_styles.include?(name)
    }.keys.sort
  end

  def overlap_risk
    @overlap_risk ||= compute_overlap_risk
  end

  def allocation_order
    @allocation_order ||= main_styles.sort_by { |name|
      [ -overlap_risk.fetch(name, 0), support.fetch(name, 0), name ]
    }
  end

  def display_order
    @display_order ||= main_styles.sort_by { |name|
      [ -support.fetch(name, 0), name ]
    }
  end

  def main_counts
    @main_counts ||= main_styles.each_with_object({}) { |name, h|
      h[name] = support.fetch(name, 0)
    }
  end

  def rotation_styles
    @rotation_styles ||= support.select { |name, count|
      next false if main_styles.include?(name) || suppressed_styles.include?(name)
      count >= MIN_RECORDS && count >= (total_listings * ROTATION_THRESHOLD).ceil
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

  def qualifying_non_broad_styles
    @qualifying_non_broad_styles ||= support.select { |name, count|
      next false if BROAD_STYLES.include?(name)
      count >= MIN_RECORDS && count >= (total_listings * ROTATION_THRESHOLD).ceil
    }.keys
  end

  def suppressed_styles
    @suppressed_styles ||= compute_suppressed
  end

  def compute_suppressed
    return Set.new if qualifying_non_broad_styles.empty?
    BROAD_STYLES.each_with_object(Set.new) { |broad, set| set.add(broad) if suppressible?(broad) }
  end

  def suppressible?(broad)
    broad_count = support[broad]
    return false if broad_count.nil? || broad_count.zero?

    count_broad_overlap(broad).to_f / broad_count >= SUPPRESSION_RATIO
  end

  def count_broad_overlap(broad)
    @listings.count do |listing|
      styles = Array(listing.styles).compact
      next false unless styles.include?(broad)
      (styles & qualifying_non_broad_styles).any?
    end
  end

  def compute_overlap_risk
    ordered = main_styles_by_support
    ordered.each_with_object({}).with_index { |(style, risks), idx|
      higher = ordered[0...idx].select { |candidate| support.fetch(candidate, 0) > support.fetch(style, 0) }
      add_overlap_entry(style, higher, risks)
    }
  end

  def add_overlap_entry(style, higher, risks)
    return if higher.empty?

    fraction = overlap_fraction(style, higher)
    risks[style] = fraction if fraction
  end

  def main_styles_by_support
    main_styles.sort_by { |name| [ -support.fetch(name, 0), name ] }
  end

  def overlap_fraction(style, higher_styles)
    style_listings = listings_with_style(style)
    return if style_listings.empty?

    overlap_count = style_listings.count { |l| (Array(l.styles).compact & higher_styles).any? }
    overlap_count.to_f / style_listings.size
  end

  def listings_with_style(style)
    @listings.select { |l| Array(l.styles).compact.include?(style) }
  end
end
