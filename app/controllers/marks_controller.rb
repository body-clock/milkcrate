# frozen_string_literal: true

# The marks controller
class MarksController < ApplicationController
  before_action :authenticate_user!

  def create
    @record = Record.find(params[:record_id])
    @mark = @record.marks.build(mark_params)
    if @mark.save
      render json: { success: true, mark: @mark }, status: :created
    else
      render json: { success: false, errors: @mark.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def mark_params
    params.require(:mark).permit(:timestamp)
  end
end
