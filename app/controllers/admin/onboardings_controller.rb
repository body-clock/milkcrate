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

  def direct
    discogs_username = params[:discogs_username].to_s.strip.downcase

    if discogs_username.blank?
      redirect_to admin_path, alert: "Discogs username is required"
      return
    end

    if Store.with_discogs_username(discogs_username).exists?
      redirect_to admin_path, alert: "Store already exists for #{discogs_username}"
      return
    end

    if Waitlist.with_discogs_username(discogs_username).exists?
      redirect_to admin_path, alert: "#{discogs_username} already has an applicant. Use the applicant onboarding path."
      return
    end

    result = StoreOnboarding.call(discogs_username:, waitlist: nil)
    redirect_to admin_path, notice: "Onboarding queued for #{result.store.name}"
  rescue StoreOnboarding::Error => error
    redirect_to admin_path, alert: error.message
  end
end
