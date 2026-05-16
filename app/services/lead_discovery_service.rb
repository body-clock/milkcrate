class LeadDiscoveryService
  Result = Data.define(:leads_created, :leads_updated, :errors)

  def self.call(...) = new(...).call

  def initialize(client: nil, seed_usernames: [])
    @client = client || DiscogsClient.new
    @seed_usernames = seed_usernames
  end

  def call
    candidates = seller_finder.find_candidates(seed_usernames: @seed_usernames)

    created = 0
    updated = 0
    errors = []

    candidates.each do |candidate|
      lead = create_or_update_lead(candidate)
      if lead&.persisted?
        if lead.previous_changes.key?("id")
          created += 1
        else
          updated += 1
        end
      end
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique => e
      errors << { username: candidate.discogs_username, error: e.message }
      Rails.logger.warn "[LeadDiscoveryService] Error upserting lead #{candidate.discogs_username}: #{e.message}"
    end

    Rails.logger.info "[LeadDiscoveryService] Discovery complete: #{created} created, #{updated} updated, #{errors.size} errors"

    Result.new(leads_created: created, leads_updated: updated, errors: errors)
  end

  private

  def seller_finder
    @seller_finder ||= LeadDiscovery::SellerFinder.new(client: @client)
  end

  def create_or_update_lead(candidate)
    existing = Lead.with_discogs_username(candidate.discogs_username).first

    if existing
      existing.update!(
        store_name: candidate.store_name,
        discogs_profile: candidate.discogs_profile,
        inventory_size: candidate.inventory_size,
        sampled_listings: candidate.sampled_listings,
        vinyl_count: candidate.vinyl_count,
        vinyl_percentage: candidate.vinyl_percentage,
        genres: candidate.genres,
        styles: candidate.styles
      )
      existing
    else
      Lead.create!(
        discogs_username: candidate.discogs_username,
        store_name: candidate.store_name,
        discogs_profile: candidate.discogs_profile,
        inventory_size: candidate.inventory_size,
        sampled_listings: candidate.sampled_listings,
        vinyl_count: candidate.vinyl_count,
        vinyl_percentage: candidate.vinyl_percentage,
        genres: candidate.genres,
        styles: candidate.styles,
        status: :pending
      )
    end
  end
end
