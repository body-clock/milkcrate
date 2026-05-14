class MarketingPreviewPresenter
  # Caps to keep the homepage preview payload bounded — it must never ship
  # a full store payload or expensive unbounded curation result.
  MAX_PREVIEW_RECORDS = 4
  MAX_FEATURED_CRATES = 2
  MAX_GENRE_CRATES = 2

  # Returns a bounded homepage preview shape:
  #   { store_name:, store_slug:, sections: [...] }
  #
  # Uses the demo store (from Settings.discogs_username) when it exists
  # with viable data. Returns typed fallback data otherwise — the homepage
  # must render even without a synced local demo store.
  #
  # Reuses StorefrontCuration and CratePresenter for serialization rather
  # than duplicating listing-presentation logic.
  def preview_data
    store = demo_store

    if store
      live_preview(store)
    else
      fallback_preview
    end
  rescue StandardError => e
    Rails.logger.warn("MarketingPreviewPresenter: #{e.class}: #{e.message}")
    fallback_preview
  end

  private

  # ── Demo store lookup ────────────────────────────────────────

  def demo_store
    Store.find_by(discogs_username: Settings.discogs_username)
  end

  # ── Live preview path ────────────────────────────────────────

  def live_preview(store)
    curation  = StorefrontCuration.new(store, filter_available: !Rails.env.development?)
    presenter = CratePresenter.new(store)
    sections  = presenter.build_storefront_sections(curation.storefront_sections)

    {
      store_name: store.name,
      store_slug: store.discogs_username,
      sections: cap_sections(sections)
    }
  end

  # ── Bounded section capping ──────────────────────────────────

  def cap_sections(sections)
    sections.filter_map do |section|
      if section[:crate]
        capped = cap_single_crate(section[:crate])
        next if capped.nil?
        { key: section[:key], crate: capped }
      elsif section[:crates]
        max = max_crates_for_key(section[:key])
        capped_crates = section[:crates].first(max).filter_map { |c| cap_single_crate(c) }
        next if capped_crates.empty?
        { key: section[:key], crates: capped_crates }
      end
    end
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
      store_name: Settings.store_name || "Philadelphia Music",
      store_slug: nil,
      sections: []
    }
  end
end
