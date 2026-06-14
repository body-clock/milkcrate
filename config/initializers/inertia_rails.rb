# frozen_string_literal: true

InertiaRails.configure do |config|
  # Cache busting — ViteRuby.digest changes on every deploy
  config.version = ViteRuby.digest
  config.encrypt_history = true
  config.always_include_errors_hash = true
  config.use_script_element_for_initial_page = true

  config.ssr_enabled = ViteRuby.config.ssr_build_enabled

  config.on_ssr_error = ->(error, page) do
    Rails.logger.warn("SSR failed for #{page[:component]}: #{error.message}")
  end
end
