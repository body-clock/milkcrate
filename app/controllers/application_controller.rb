class ApplicationController < ActionController::Base
  include SellerWantlistHandoff

  allow_browser versions: :modern
end
