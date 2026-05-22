class Admin::StoreOnboardingChecks
  Result = Data.define(:valid, :error_message, :conflicting_record, :normalized_username)

  def initialize(discogs_username, check_applicant: true)
    @raw_username = discogs_username.to_s
    @normalized = @raw_username.strip.downcase
    @check_applicant = check_applicant
  end

  def call
    return Result.new(valid: false, error_message: "Discogs username is required", conflicting_record: nil, normalized_username: @normalized) if @normalized.blank?

    if (store = Store.with_discogs_username(@normalized).first)
      return Result.new(valid: false, error_message: "Store already exists for #{@normalized}", conflicting_record: store, normalized_username: @normalized)
    end

    if @check_applicant && (applicant = Waitlist.with_discogs_username(@normalized).first)
      return Result.new(valid: false, error_message: "#{@normalized} already has an applicant. Use the applicant onboarding path.", conflicting_record: applicant, normalized_username: @normalized)
    end

    Result.new(valid: true, error_message: nil, conflicting_record: nil, normalized_username: @normalized)
  end
end
