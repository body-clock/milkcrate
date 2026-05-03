class WaitlistsController < ApplicationController
  layout "inertia_application"

  def create
    entry = Waitlist.new(waitlist_params)

    if entry.save
      render inertia: "apply", props: { submitted: true }
    else
      render inertia: "apply", props: {
        submitted: false,
        errors: entry.errors.as_json
      }
    end
  end

  private

  def waitlist_params
    params.require(:waitlist).permit(:name, :discogs_username, :email, :inventory_size, :notes)
  end
end
