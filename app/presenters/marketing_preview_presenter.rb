# Serializes marketing preview data for the storefront signup page.
class MarketingPreviewPresenter
  # Caps to keep the homepage preview payload bounded — it must never ship
  # a full store payload or expensive unbounded curation result.
  MAX_PREVIEW_RECORDS = 4
  MAX_FEATURED_CRATES = 2
  MAX_GENRE_CRATES = 2

  # Returns a bounded homepage preview shape:
  #   { store_name:, store_slug:, sections: [...] }
  #
  # Uses the demo store (from Settings.demo_store.discogs_username) when it exists
  # with viable data. Returns typed fallback data otherwise — the homepage
  # must render even without a synced local demo store.
  #
  # Reuses StorefrontCuration and CratePresenter for serialization rather
  # than duplicating listing-presentation logic.
  def preview_data
    store = demo_store
    store ? live_preview(store) : fallback_preview
  rescue StandardError => e
    Rails.logger.warn("MarketingPreviewPresenter: #{e.class}: #{e.message}")
    fallback_preview
  end

  private

  # ── Demo store lookup ────────────────────────────────────────

  def demo_store
    Store.find_by(discogs_username: Settings.demo_store.discogs_username)
  rescue StandardError => e
    Rails.logger.warn("MarketingPreviewPresenter: #{e.class}: #{e.message}")
    nil
  end

  # ── Live preview path ────────────────────────────────────────

  def live_preview(store)
    cached = StorefrontCuration.cached_curation(store,
      filter_available: !Rails.env.development?)

    {
      store_name: store.name,
      store_slug: store.discogs_username,
      sections: cap_sections(cached[:sections])
    }
  end

  # ── Bounded section capping ──────────────────────────────────

  def cap_sections(sections)
    sections.filter_map { |section| cap_section(section) }
  end

  def cap_section(section)
    if section[:crate]
      cap_single_crate_section(section)
    elsif section[:crates]
      cap_multi_crate_section(section)
    end
  end

  def cap_single_crate_section(section)
    capped = cap_single_crate(section[:crate])
    return nil if capped.nil?
    { key: section[:key], crate: capped }
  end

  def cap_multi_crate_section(section)
    max = max_crates_for_key(section[:key])
    capped_crates = section[:crates].first(max).filter_map { |c| cap_single_crate(c) }
    return nil if capped_crates.empty?
    { key: section[:key], crates: capped_crates }
  end

  def cap_single_crate(crate)
    return nil if crate[:records].empty?
    capped = crate.dup
    capped[:records] = capped[:records].first(MAX_PREVIEW_RECORDS)
    capped[:count] = capped[:records].size
    capped
  end

  def max_crates_for_key(key)
    case key
    when "featured_crates" then MAX_FEATURED_CRATES
    when "genre_grid"      then MAX_GENRE_CRATES
    else 1
    end
  end

  # ── Fallback path ────────────────────────────────────────────

  def fallback_preview
    {
      store_name: Settings.demo_store.name || "Philadelphia Music",
      store_slug: nil,
      sections: []
    }
  end
end
