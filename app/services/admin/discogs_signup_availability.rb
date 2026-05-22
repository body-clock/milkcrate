class Admin::DiscogsSignupAvailability
  Result = Data.define(:status, :data, :errors)

  def initialize(username, lookup: DiscogsSellerLookup.new(username))
    @username = username.to_s.strip
    @normalized = @username.downcase
    @lookup = lookup
  end

  def call
    result = @lookup.call

    unless result[:found]
      return failed_result(result)
    end

    if (store = Store.with_discogs_username(@normalized).first)
      return already_active_result(@normalized, store)
    end

    if (applicant = Waitlist.with_discogs_username(@normalized).first)
      return existing_applicant_result(@normalized, applicant)
    end

    creatable_result(@normalized, result)
  end

  private

  def failed_result(lookup)
    reason = lookup[:reason].to_s
    status = reason == "invalid_slug" ? "invalid" : "lookup_error"

    Result.new(
      status:,
      data: { reason:, creatable: false },
      errors: nil
    )
  end

  def creatable_result(username, lookup)
    Result.new(
      status: "creatable",
      data: {
        creatable: true,
        username:,
        seller_name: lookup[:seller_name],
        avatar_url: lookup[:avatar_url]
      },
      errors: nil
    )
  end

  def already_active_result(username, store)
    Result.new(
      status: "already_active",
      data: {
        creatable: false,
        username:,
        store: { id: store.id, name: store.name, discogs_username: store.discogs_username }
      },
      errors: nil
    )
  end

  def existing_applicant_result(username, applicant)
    Result.new(
      status: "existing_applicant",
      data: {
        creatable: false,
        username:,
        applicant: { id: applicant.id, name: applicant.name, discogs_username: applicant.discogs_username }
      },
      errors: nil
    )
  end
end
