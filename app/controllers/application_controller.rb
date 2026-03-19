class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  before_action :http_authenticate
  before_action :set_current_dig_session

  private

  def http_authenticate
    authenticate_or_request_with_http_basic("Milkcrate") do |user, password|
      ActiveSupport::SecurityUtils.secure_compare(user, ENV.fetch("MILKCRATE_USER", "milkcrate")) &&
        ActiveSupport::SecurityUtils.secure_compare(password, ENV.fetch("MILKCRATE_PASSWORD"))
    end
  end

  def set_current_dig_session
    @current_dig_session = DigSession.current
  end
end
