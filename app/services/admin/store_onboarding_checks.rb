class Admin::StoreOnboardingChecks
  Result = Data.define(:valid, :error_message, :conflicting_record, :normalized_username)

  def initialize(discogs_username, check_applicant: true)
    @raw_username = discogs_username.to_s
    @normalized = @raw_username.strip.downcase
    @check_applicant = check_applicant
  end

  def call
    return blank_result if @normalized.blank?
    return conflicting_store_result if (store = existing_store)
    return conflicting_applicant_result if (applicant = existing_applicant)

    valid_result
  end

  private

  def existing_store
    Store.with_discogs_username(@normalized).first
  end

  def existing_applicant
    Waitlist.with_discogs_username(@normalized).first if @check_applicant
  end

  def blank_result
    Result.new(valid: false, error_message: "Discogs username is required", conflicting_record: nil, normalized_username: @normalized)
  end

  def conflicting_store_result
    store = existing_store
    Result.new(valid: false, error_message: "Store already exists for #{@normalized}", conflicting_record: store, normalized_username: @normalized)
  end

  def conflicting_applicant_result
    applicant = existing_applicant
    Result.new(valid: false, error_message: "#{@normalized} already has an applicant. Use the applicant onboarding path.", conflicting_record: applicant, normalized_username: @normalized)
  end

  def valid_result
    Result.new(valid: true, error_message: nil, conflicting_record: nil, normalized_username: @normalized)
  end
end
