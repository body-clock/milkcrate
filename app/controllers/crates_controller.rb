# frozen_string_literal: true

# The crates controller
class CratesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_crate, only: %i[show destroy]

  # GET /crates
  def index
    @crates = current_user.crates
  end

  # GET /crates/1
  def show
    @records = @crate.records
  end

  # POST /crates
  def create
    @crate = current_user.crates.new(crate_params)
    if @crate.save
      redirect_to crates_path
    else
      render :new
    end
  end

  # DELETE /crates/:id
  def destroy
    @crate.destroy
    redirect_to crates_url
  end

  private

  def set_crate
    @crate = current_user.crates.find(params[:id])
  end

  def crate_params
    params.require(:crate).permit(:name)
  end
end
