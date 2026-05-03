class PagesController < ApplicationController
  layout "inertia_application"

  def home
    render inertia: "home", props: {
      copy: t("pages.home").to_h
    }
  end

  def apply
    render inertia: "apply", props: {
      copy: t("pages.apply").to_h
    }
  end
end
