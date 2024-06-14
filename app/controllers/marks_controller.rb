# frozen_string_literal: true

# The marks controller
class MarksController < ApplicationController
  before_action :authenticate_user!

  def create
    @record = Record.find(params[:record_id])
    @mark = @record.marks.build(mark_params)
    if @mark.save
      respond_to do |format|
        format.turbo_stream
        format.html do
          redirect_to crate_record_path(@record.crate.id, @record.id), notice: 'Mark was successfully created.'
        end
      end
    else
      render json: { success: false, errors: @mark.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def mark_params
    params.require(:mark).permit(:timestamp)
  end
end
