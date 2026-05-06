class WaitlistsController < ApplicationController
  layout "inertia_application"

  def create
    unless turnstile_verified?
      return render inertia: "apply", props: apply_props.merge(
        submitted: false,
        errors: { turnstile: [ { error: "Please confirm you are human.", value: nil } ] }
      )
    end

    entry = Waitlist.new(waitlist_params)

    if entry.save
      SellerMailer.confirmation(entry).deliver_later
      render inertia: "apply", props: apply_props.merge(submitted: true)
    else
      render inertia: "apply", props: apply_props.merge(
        submitted: false,
        errors: entry.errors.as_json
      )
    end
  end

  private

  def turnstile_verified?
    return true unless TurnstileVerifier.enabled?

    TurnstileVerifier.verify(token: turnstile_token, remote_ip: request.remote_ip)
  end

  def turnstile_token
    params[:turnstile_token].presence || params[:"cf-turnstile-response"].presence
  end

  def waitlist_params
    params.require(:waitlist).permit(:name, :discogs_username, :email, :inventory_size, :notes)
  end

  def apply_props
    {
      copy: t("pages.apply").to_h,
      turnstile: {
        enabled: TurnstileVerifier.enabled?,
        site_key: TurnstileVerifier.site_key
      }
    }
  end
end
