# Admin onboarding flow for claiming and setting up new stores.
class Admin::OnboardingsController < Admin::BaseController
  def create
    waitlist = Waitlist.find(params[:waitlist_id])

    checks = build_checks(waitlist.discogs_username, check_applicant: false)
    perform_or_redirect(checks, discogs_username: waitlist.discogs_username, waitlist:)
  end

  def direct
    checks = build_checks(params[:discogs_username])
    perform_or_redirect(checks, discogs_username: checks.normalized_username, waitlist: nil)
  end

  private

  def build_checks(username, check_applicant: true)
    Admin::StoreOnboardingChecks.new(username, check_applicant:).call
  end

  def perform_or_redirect(checks, discogs_username:, waitlist:)
    if checks.valid
      perform_onboarding(discogs_username:, waitlist:)
    else
      redirect_to admin_path, alert: checks.error_message
    end
  end

  def perform_onboarding(discogs_username:, waitlist:)
    result = StoreOnboarding.call(discogs_username:, waitlist:)
    redirect_to admin_path, notice: "Onboarding queued for #{result.store.name}"
  rescue StoreOnboarding::Error => error
    redirect_to admin_path, alert: error.message
  end
end
