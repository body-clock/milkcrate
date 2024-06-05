# frozen_string_literal: true

# Capybara config based on https://evilmartians.com/chronicles/system-of-a-test-setting-up-end-to-end-rails-testing

# We use a Capybara default value here explicitly.
Capybara.default_max_wait_time = 3

# Normalize whitespaces when using `has_text?` and similar matchers,
# i.e., ignore newlines, trailing spaces, etc.
# That makes tests less dependent on slightly UI changes.
Capybara.default_normalize_ws = true

# Disable CSS transitions
Capybara.disable_animation = true

# Where to store system tests artifacts (e.g. screenshots, downloaded files, etc.).
# It could be useful to be able to configure this path from the outside (e.g., on CI).
Capybara.save_path = ENV.fetch('CAPYBARA_ARTIFACTS', './tmp/capybara')

# Make server accessible from the outside world
Capybara.server_host = '0.0.0.0'

# Use a hostname that could be resolved in the internal Docker network
Capybara.app_host = if ENV.fetch('VAGRANT', false) || ENV.fetch('CI', false)
                      "http://#{`hostname`.strip&.downcase || '0.0.0.0'}"
                    else
                      'http://host.docker.internal'
                    end

RSpec.configure do |config|
  # Make sure this hook runs before others
  config.prepend_before(:each, type: :system) do
    # Use JS driver always
    driven_by Capybara.javascript_driver
  end
end
