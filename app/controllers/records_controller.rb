# frozen_string_literal: true

# The records controller
class RecordsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_crate

  def show
    @record = @crate.records.find(params[:id])
  end

  # POST /crates/1/records
  def create
    @record = @crate.records.build(record_params)

    video_data = Youtube::Service.video_data(url: @record.url)
    @record.title = video_data['title']
    @record.thumbnail = video_data['thumbnail_url']
    @record.save
    if @record.save
      redirect_to @crate, notice: 'Record was successfully created.'
    else
      flash.alert = record.errors.full_messages.join(', ')
      redirect_to @crate, alert: record.errors.full_messages.join(', ')
    end
  end

  def destroy
    @record = @crate.records.find(params[:id])
    @record.destroy
    flash.notice = 'Record was successfully destroyed.'
    redirect_to @crate
  end

  private

  def set_crate
    @crate = current_user.crates.find(params[:crate_id])
  end

  def record_params
    params.require(:record).permit(:url)
  end
end
