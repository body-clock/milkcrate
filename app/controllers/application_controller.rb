class ApplicationController < ActionController::Base
  include SeoHelper

  inertia_share app_version: -> { AppVersion.display }
end
