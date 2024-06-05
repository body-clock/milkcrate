# frozen_string_literal: true

# Load general RSpec Rails config
require 'rails_helper'

# Load System-spec specific config and helpers
Dir[File.join(__dir__, 'system/support/**/*.rb')].each { |file| require file }
