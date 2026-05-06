Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data, :blob
    policy.object_src  :none
    policy.script_src  :self, :https
    policy.style_src   :self, :https, :unsafe_inline
    policy.connect_src :self, :https
    policy.frame_src   :self, :https
    policy.media_src   :self

    if Rails.env.development?
      policy.script_src *policy.script_src, :unsafe_eval, "http://#{ViteRuby.config.host_with_port}"
      policy.connect_src *policy.connect_src, "ws://#{ViteRuby.config.host_with_port}"
    end
  end

  config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(16) }
  config.content_security_policy_nonce_directives = %w[script-src]
  config.content_security_policy_nonce_auto = true
end
