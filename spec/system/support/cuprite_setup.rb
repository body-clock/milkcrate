# frozen_string_literal: true

# Cuprite config based on https://evilmartians.com/chronicles/system-of-a-test-setting-up-end-to-end-rails-testing

# First, load Cuprite Capybara integration
require 'capybara/cuprite'

# Parse URL
# NOTE: REMOTE_CHROME_HOST should be added to Webmock/VCR allowlist if you use any of those.
REMOTE_CHROME_URL = ENV.fetch('CHROME_URL', 'http://localhost:3333')
REMOTE_CHROME_HOST, REMOTE_CHROME_PORT =
  if REMOTE_CHROME_URL
    URI.parse(REMOTE_CHROME_URL).then do |uri|
      [uri.host, uri.port]
    end
  end

# Check whether the remote chrome is running.
remote_chrome =
  begin
    if REMOTE_CHROME_URL.nil?
      false
    else
      Socket.tcp(REMOTE_CHROME_HOST, REMOTE_CHROME_PORT, connect_timeout: 1).close
      true
    end
  rescue Errno::ECONNREFUSED, Errno::EHOSTUNREACH, SocketError
    false
  end

remote_options = remote_chrome ? { url: REMOTE_CHROME_URL } : {}

# Then, we need to register our driver to be able to use it later
# with #driven_by method.
# NOTE: The name :cuprite is already registered by Rails.
# See https://github.com/rubycdp/cuprite/issues/180
Capybara.register_driver(:better_cuprite) do |app|
  Capybara::Cuprite::Driver.new(
    app,
    **{
      window_size: [1200, 800],
      browser_options: remote_chrome ? { 'no-sandbox' => nil } : {},
      # Increase Chrome startup wait time (required for stable CI builds)
      process_timeout: 10,
      # Enable debugging capabilities
      inspector: true,
      # TODO: "expected" console error from importmaps shim (?) causes exception failing all system specs
      js_errors: false,
      timeout: 10
    }.merge(remote_options)
  )
end

# Configure Capybara to use :better_cuprite driver by default
Capybara.default_driver = Capybara.javascript_driver = :better_cuprite

module CupriteHelpers
  # Drop #pause anywhere in a test to stop the execution.
  # Useful when you want to checkout the contents of a web page in the middle of a test
  # running in a headful mode.
  def pause
    page.driver.pause
  end

  def debug(binding = nil)
    $stdout.puts '🔎 Open Chrome inspector at http://localhost:3333'
    return binding.break if binding

    page.driver.pause
  end
end

RSpec.configure do |config|
  config.include CupriteHelpers, type: :system
end
