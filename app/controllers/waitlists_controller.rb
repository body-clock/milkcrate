# Waitlist signup and status for the vendor waiting list.
class WaitlistsController < ApplicationController
  layout "inertia_application"

  def create
    result = register_waitlist
    return redirect_on_success if result.success

    render inertia: "apply", props: apply_props.merge(submitted: false, errors: result.errors)
  end

  def redirect_on_success
    redirect_to apply_path, flash: { notice: "You're on the list! We'll be in touch.", submitted: true }
  end

  def register_waitlist
    WaitlistRegistration.new(waitlist_params, turnstile_token:, remote_ip: request.remote_ip).call
  end

  private

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
