class WaitlistsController < ApplicationController
  layout "inertia_application"

  def create
    entry = Waitlist.new(waitlist_params)

    if entry.save
      render inertia: "apply", props: apply_props.merge(submitted: true)
    else
      render inertia: "apply", props: apply_props.merge(
        submitted: false,
        errors: entry.errors.as_json
      )
    end
  end

  private

  def waitlist_params
    params.require(:waitlist).permit(:name, :discogs_username, :email, :inventory_size, :notes)
  end

  def apply_props
    { copy: t("pages.apply").to_h }
  end
end
