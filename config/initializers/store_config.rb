# Reads per-instance store configuration from config/store.yml.
# Falls back to database lookup for backward compatibility.
module StoreConfig
  CONFIG_PATH = Rails.root.join("config/store.yml")

  def self.config
    @config ||= YAML.safe_load_file(CONFIG_PATH) if File.exist?(CONFIG_PATH)
  end

  def self.username
    config&.dig("discogs_username") || ENV.fetch("STORE_USERNAME", nil)
  end

  def self.name
    config&.dig("name")
  end

  def self.description
    config&.dig("description")
  end

  def self.domain
    config&.dig("domain")
  end
end
