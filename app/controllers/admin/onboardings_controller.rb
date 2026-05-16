class Admin::OnboardingsController < Admin::BaseController
  def create
    waitlist = Waitlist.find(params[:waitlist_id])

    if Store.with_discogs_username(waitlist.discogs_username).exists?
      redirect_to admin_path, alert: "Store already exists for #{waitlist.discogs_username}"
      return
    end

    result = StoreOnboarding.call(discogs_username: waitlist.discogs_username, waitlist:)
    redirect_to admin_path, notice: "Onboarding queued for #{result.store.name}"
  rescue StoreOnboarding::Error => error
    redirect_to admin_path, alert: error.message
  end
end
