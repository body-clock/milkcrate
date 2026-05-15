InertiaRails.configure do |config|
  config.layout = "inertia_application"

  # Cache busting — ensures users get fresh JS after deployments
  config.version = -> { ViteRuby.digest }

  # Flash keys are automatically shared as top-level props by Inertia Rails
  # Default: %i[notice alert] — accessible as page.props.notice, page.props.alert

  config.use_script_element_for_initial_page = true
  config.always_include_errors_hash = true

  # Server-Side Rendering (adv-04)
  # Enables when a Node.js SSR server is running. Uncomment to enable:
  # config.ssr_enabled = Rails.env.production?
  # config.ssr_url = nil  # auto-detect from Vite dev server

  # CamelCase prop transformer (props-10)
  # Uncomment when frontend types are migrated to camelCase:
  # config.prop_transformer = ->(props:) {
  #   props.deep_transform_keys { |key| key.to_s.camelize(:lower) }
  # }
end
