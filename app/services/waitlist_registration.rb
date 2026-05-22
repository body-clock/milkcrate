class WaitlistRegistration
  Result = Data.define(:success, :waitlist, :errors)

  def initialize(params, turnstile_token: nil, turnstile_verifier: TurnstileVerifier, remote_ip: nil)
    @params = params
    @turnstile_token = turnstile_token
    @turnstile_verifier = turnstile_verifier
    @remote_ip = remote_ip
  end

  def call
    unless turnstile_verified?
      return Result.new(success: false, waitlist: nil, errors: {
        turnstile: [ { error: "Please confirm you are human.", value: nil } ]
      })
    end

    entry = Waitlist.new(waitlist_params)

    if entry.save
      SellerMailer.confirmation(entry).deliver_later
      SellerMailer.admin_notification(entry).deliver_later
      Result.new(success: true, waitlist: entry, errors: nil)
    else
      Result.new(success: false, waitlist: entry, errors: serialize_errors(entry.errors))
    end
  end

  private

  def turnstile_verified?
    return true unless @turnstile_verifier.enabled?

    @turnstile_verifier.verify(token: @turnstile_token, remote_ip: @remote_ip)
  end

  def waitlist_params
    @params.permit(:name, :discogs_username, :email, :inventory_size, :notes)
  end

  def serialize_errors(errors)
    errors.each_with_object({}) do |error, hash|
      attribute = error.attribute
      hash[attribute] ||= []
      hash[attribute] << { error: error.message, value: error.options[:value] }
    end
  end
end
