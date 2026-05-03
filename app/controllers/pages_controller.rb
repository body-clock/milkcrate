class PagesController < ApplicationController
  layout "inertia_application"

  def home
    render inertia: "home"
  end

  def apply
    render inertia: "apply"
  end
end
