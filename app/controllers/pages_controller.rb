# Public-facing pages (home, about, waitlist).
class PagesController < ApplicationController
  layout "inertia_application"

  def home
    render inertia: "home", props: {
      copy: t("pages.home").to_h,
      preview: MarketingPreviewPresenter.new.preview_data
    }
  end

  def apply
    render inertia: "apply", props: {
      submitted: flash[:submitted] || false,
      copy: t("pages.apply").to_h,
      turnstile: {
        enabled: TurnstileVerifier.enabled?,
        site_key: TurnstileVerifier.site_key
      },
      initial_discogs_username: params[:discogs_username]
    }
  end
end
