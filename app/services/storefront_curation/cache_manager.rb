# Manages caching of fully-serialized storefront curation payloads.
class StorefrontCuration::CacheManager
    CURATION_CACHE_TTL = 36.hours
    CURATION_CACHE_RACE_TTL = 30.seconds
    CURATION_CACHE_KEY = "storefront/curation/v1/%<store_id>s/%<date>s/%<scope>s"

    # Returns { sections: [...], crates: [...] } — plain hashes, cache-safe.
    # On cache miss, runs curation + presentation, writes to cache, returns payload.
    # On cache hit, returns cached payload without instantiating curation or presenter.
    def self.cached_curation(store, filter_available: true, cache: Rails.cache)
      cache.fetch(curation_cache_key(store, filter_available:),
        expires_in: CURATION_CACHE_TTL, race_condition_ttl: CURATION_CACHE_RACE_TTL) { build_payload(store, filter_available:) }
    end

    # Writes the fully-serialized curation payload to cache.
    # Used by DailyCurationService for pre-warming.
    def self.write_curation_cache(store, curation_payload, filter_available: true, cache: Rails.cache)
      key = curation_cache_key(store, filter_available:)
      cache.write(key, curation_payload, expires_in: CURATION_CACHE_TTL)
    end

    def self.build_payload(store, filter_available:)
      curation  = StorefrontCuration.new(store, filter_available:)
      scorer    = dev_scorer(curation)
      presenter = CratePresenter.new(store, scorer:)
      {
        sections: presenter.build_storefront_sections(curation.storefront_groups),
        crates:   presenter.build_crates(curation.crates)
      }
    end

    # Builds the cache key incorporating store, date, and listing scope.
    # When filter_available is true the scope is "available"; when false it's "all".
    # This prevents scope collisions — e.g. DailyCurationService pre-warms with
    # filter_available: true while development storefronts use filter_available: false.
    def self.curation_cache_key(store, filter_available: true)
      scope = filter_available ? "available" : "all"
      CURATION_CACHE_KEY % { store_id: store.id, date: Date.current.iso8601, scope: }
    end

    def self.dev_scorer(curation)
      return nil unless Rails.env.development?
      RecordScorer.new(genre_counts: curation.send(:genre_counts), today: Date.today)
    end

    private_class_method :build_payload, :curation_cache_key, :dev_scorer
end
