# frozen_string_literal: true

# Classifies Discogs styles for a narrow-catalog store into three tiers:
# main, rotation, and omitted. Computed once per curation instance from
# eligible listings and consumed by StylesAxis for crate allocation,
# display ordering, and thematic candidate filtering.
class StyleSelection
  MAIN_THRESHOLD = 0.05
  ROTATION_THRESHOLD = 0.01
  MIN_RECORDS = CuratedCrate::MIN_RECORDS

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
      count >= MIN_RECORDS && count >= (total_listings * MAIN_THRESHOLD).ceil
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
      next false if main_styles.include?(name)
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

  def compute_overlap_risk
    ordered = main_styles_by_support
    ordered.each_with_object({}).with_index { |(style, risks), idx|
      add_overlap_entry(style, ordered[0...idx], risks)
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
