class LeadDiscovery::WebPresenceChecker
  # Ecommerce platforms to check via domain-name guessing.
  ECOMMERCE_PLATFORMS = {
    shopify: ->(name) { [ "#{name}.myshopify.com", "#{name}.shopify.com" ] },
    bigcartel: ->(name) { [ "#{name}.bigcartel.com" ] },
    square: ->(name) { [ "#{name}.square.site" ] },
    ecwid: ->(name) { [ "#{name}.ecwid.com" ] },
    storenvy: ->(name) { [ "#{name}.storenvy.com" ] },
    wix: ->(name) { [ "#{name}.wixsite.com", "#{name}.wix.com" ] }
  }.freeze

  # Social media domains that are not ecommerce.
  SOCIAL_DOMAINS = %w[
    instagram.com facebook.com twitter.com x.com tiktok.com
    youtube.com bandcamp.com soundcloud.com mixcloud.com
  ].freeze

  # URLs that indicate standalone ecommerce in a Discogs profile.
  ECOMMERCE_KEYWORDS = %w[
    shopify.com bigcartel.com square.site ecwid.com storenvy.com
    wix.com wixsite.com myshopify.com
  ].freeze

  TIMEOUT = 5

  Result = Data.define(
    :platforms,     # Hash of platform => found URL or nil
    :listed_urls,   # Array of URLs found in Discogs profile
    :classified_as, # "no_presence", "social_media", or "standalone_ecommerce"
    :notes          # Human-readable summary
  )

  def initialize(http_client: nil)
    @http = http_client || build_http_client
  end

  # Check a Lead's web presence and return a Result.
  # Stores the result hash directly into the lead's `web_presence` jsonb column.
  def check(lead)
    profile_urls = extract_profile_urls(lead.discogs_profile)
    slug = slugify(lead.store_name.presence || lead.discogs_username)

    platforms = check_platforms(slug)
    classified_as = classify(platforms, profile_urls)
    notes = build_notes(classified_as, platforms, profile_urls)

    Result.new(
      platforms: platforms,
      listed_urls: profile_urls,
      classified_as: classified_as,
      notes: notes
    )
  end

  # Convenience: check and store result on the lead.
  def check_and_store!(lead)
    result = check(lead)
    lead.update!(web_presence: result.to_h)
    result
  end

  private

  # ── Profile URL Extraction ─────────────────────────────────────────────

  def extract_profile_urls(profile)
    return [] if profile.blank?

    text = [ profile["profile"], profile["location"] ].compact.join(" ")
    return [] if text.blank?

    text.scan(%r{https?://[^\s,;]+}).map { |url| url.delete_suffix(".").delete_suffix(",") }
  end

  # ── Platform Checking ──────────────────────────────────────────────────

  def check_platforms(slug)
    results = {}

    ECOMMERCE_PLATFORMS.each do |platform, domain_builder|
      domain_builder.call(slug).each do |domain|
        url = "https://#{domain}"
        found = domain_reachable?(url)
        if found
          results[platform.to_s] = url
          break  # first match per platform
        end
      end

      results[platform.to_s] = nil unless results.key?(platform.to_s)
    end

    results
  end

  def domain_reachable?(url)
    response = @http.get(url, nil, nil)
    response.status < 400
  rescue Faraday::ConnectionFailed, Faraday::TimeoutError
    false
  end

  # ── Classification ─────────────────────────────────────────────────────

  def classify(platforms, profile_urls)
    all_urls = platform_urls(platforms) + profile_urls

    # Check if any URL contains an ecommerce platform keyword.
    has_ecommerce = all_urls.any? do |url|
      ECOMMERCE_KEYWORDS.any? { |kw| url.include?(kw) }
    end

    return "standalone_ecommerce" if has_ecommerce

    # Check if any URL is social media.
    has_social = all_urls.any? do |url|
      SOCIAL_DOMAINS.any? { |domain| url.include?(domain) }
    end

    return "social_media" if has_social

    # Check if profile has any URLs at all.
    return "no_presence" if all_urls.empty?

    "other"
  end

  def platform_urls(platforms)
    platforms.values.compact
  end

  # ── Notes ──────────────────────────────────────────────────────────────

  def build_notes(classified_as, platforms, profile_urls)
    case classified_as
    when "standalone_ecommerce"
      found = platform_urls(platforms).map { |u| "  - #{u}" }.join("\n")
      "Standalone ecommerce found:\n#{found}"
    when "social_media"
      urls = profile_urls.map { |u| "  - #{u}" }.join("\n")
      "Social media presence found:\n#{urls}"
    when "no_presence"
      "No public web presence found."
    else
      urls = (platform_urls(platforms) + profile_urls).map { |u| "  - #{u}" }.join("\n")
      "Other web presence:\n#{urls}"
    end
  end

  # ── Helpers ────────────────────────────────────────────────────────────

  def slugify(name)
    name.downcase
        .gsub(/[^a-z0-9]+/, "-")
        .gsub(/\A-+|-+\z/, "")
        .gsub(/-+/, "-")
        .presence || "shop"
  end

  def build_http_client
    Faraday.new do |f|
      f.options.timeout = TIMEOUT
      f.options.open_timeout = 3
      f.adapter Faraday.default_adapter
    end
  end
end
