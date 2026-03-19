class DigSessionsController < ApplicationController
  def index
    @dig_sessions = DigSession.order(created_at: :desc)
  end

  def show
    @dig_session = DigSession.find(params[:id])
    @items = @dig_session.listings.includes(:store)
  end

  def create
    store = Store.find(params[:store_id])
    @dig_session = DigSession.create!(store: store)
    redirect_to root_path, notice: "New dig session started."
  end

  def close
    @dig_session = DigSession.find(params[:id])
    @dig_session.closed!
    redirect_to dig_sessions_path, notice: "Session saved."
  end
end
