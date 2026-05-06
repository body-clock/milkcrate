class NewArrivalsPolicy
  # Windows to try when selecting new arrivals, from newest to oldest.
  # The first window with MIN_RECORDS or more eligible records wins.
  WINDOWS = [7, 14, 30, 90, 365].freeze

  # Minimum records required in a window to create a new-arrivals crate.
  MIN_RECORDS = 4

  # Number of records in the new-arrivals crate.
  CRATE_SIZE = 4

  # Select up to CRATE_SIZE records from the first window with enough
  # eligible listings. Falls back to the most recent records overall if
  # no window has enough.
  def select(pool, sort_key:)
    return [] if pool.empty?

    WINDOWS.each do |days|
      cutoff = days.days.ago
      recent = pool.select { |listing| listing.listed_at.present? && listing.listed_at >= cutoff }
      return recent.sort_by { |listing| -sort_key.call(listing) }.first(CRATE_SIZE) if recent.size >= MIN_RECORDS
    end

    pool.sort_by { |listing| -sort_key.call(listing) }.first(CRATE_SIZE)
  end
end
