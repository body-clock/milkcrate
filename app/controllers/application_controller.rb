class ApplicationController < ActionController::Base
  allow_browser versions: :modern
  stale_when_importmap_changes

  before_action :set_current_dig_session

  inertia_share do
    {
      current_session: @current_dig_session ? {
        id: @current_dig_session.id,
        name: @current_dig_session.name,
        item_ids: @current_dig_session.dig_session_items.pluck(:listing_id)
      } : nil,
      flash: {
        notice: flash.notice,
        alert: flash.alert
      }.compact
    }
  end

  private

  def set_current_dig_session
    @current_dig_session = DigSession.current
  end
end
