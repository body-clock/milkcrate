class EventsController < ApplicationController
  def create
    ListingEvent.create!(
      listing_id: params.require(:listing_id),
      store_id: params.require(:store_id),
      event_type: params.require(:event_type)
    )
    head :no_content
  rescue ActionController::ParameterMissing
    head :unprocessable_entity
  rescue ActiveRecord::RecordInvalid
    head :unprocessable_entity
  end
end
