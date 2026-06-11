# Public-facing pages (home, about, waitlist).
class PagesController < ApplicationController
  layout "inertia_application"

  before_action :set_page_seo

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

  private

  def set_page_seo
    @page_seo = page_seo_for(action_name)
  end

  def page_seo_for(action)
    seo = SEO_CONFIG[action] || {}
    seo = seo.merge(meta_robots: "noindex") if action == "apply"
    seo = seo.merge(head_html: home_json_ld_html) if action == "home"
    seo
  end

  def home_json_ld_html
    %(<script type="application/ld+json">#{seo_home_json_ld}</script>)
  end

  SEO_CONFIG = {
    "home" => I18n.t("pages.seo.home"),
    "apply" => I18n.t("pages.seo.apply")
  }.freeze
end
