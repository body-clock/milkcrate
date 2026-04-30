class ApplicationController < ActionController::Base
  allow_browser versions: :modern

  inertia_share do
    {
      flash: {
        notice: flash.notice,
        alert: flash.alert
      }.compact,
      contact_email: Settings.contact_email.presence
    }
  end
end
