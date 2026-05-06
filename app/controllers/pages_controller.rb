class PagesController < ApplicationController
  layout "inertia_application"

  def home
    render inertia: "home", props: {
      copy: t("pages.home").to_h
    }
  end

  def apply
    render inertia: "apply", props: {
      submitted: flash[:submitted] || false,
      copy: t("pages.apply").to_h,
      turnstile: {
        enabled: TurnstileVerifier.enabled?,
        site_key: TurnstileVerifier.site_key
      }
    }
  end
end
