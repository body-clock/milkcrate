# Admin onboarding flow for claiming and setting up new stores.
class Admin::OnboardingsController < Admin::BaseController
  def create
    waitlist = Waitlist.find(params[:waitlist_id])

    checks = Admin::StoreOnboardingChecks.new(waitlist.discogs_username, check_applicant: false).call
    if checks.valid
      perform_onboarding(discogs_username: waitlist.discogs_username, waitlist:)
    else
      redirect_to admin_path, alert: checks.error_message
    end
  end

  def direct
    checks = Admin::StoreOnboardingChecks.new(params[:discogs_username]).call
    if checks.valid
      perform_onboarding(discogs_username: checks.normalized_username, waitlist: nil)
    else
      redirect_to admin_path, alert: checks.error_message
    end
  end

  private

  def perform_onboarding(discogs_username:, waitlist:)
    result = StoreOnboarding.call(discogs_username:, waitlist:)
    redirect_to admin_path, notice: "Onboarding queued for #{result.store.name}"
  rescue StoreOnboarding::Error => error
    redirect_to admin_path, alert: error.message
  end
end
