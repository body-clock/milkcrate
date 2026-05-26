# Seed initial admin user.
# Usage: bin/rails db:seed or DISABLE_ADMIN_SEED=true to skip.

if ActiveRecord::Base.connection.data_source_exists?("admins") && AdminUser.count.zero?
  email = Rails.application.credentials.dig(:admin, :email) || ENV.fetch("ADMIN_EMAIL", "admin@milkcrate.fm")
  password = Rails.application.credentials.dig(:admin, :password) || ENV.fetch("ADMIN_PASSWORD") { SecureRandom.base64(24) }

  admin = AdminUser.create!(email:, password:, password_confirmation: password)

  puts "─── Admin created ───"
  puts "  Email:    #{admin.email}"
  puts "  Password: #{password}"
  puts "─────────────────────"
  puts "Sign in at /admin/login and set up two-factor authentication."
end
