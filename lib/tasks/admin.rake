namespace :admin do
  desc "Create a new admin user"
  task :create, [:email] => :environment do |_t, args|
    email = args[:email] || Rails.application.credentials.dig(:admin, :email) || ENV["ADMIN_EMAIL"]
    abort "Usage: bin/rails admin:create[email@example.com] or set ADMIN_EMAIL" unless email

    password = Rails.application.credentials.dig(:admin, :password) || ENV.fetch("ADMIN_PASSWORD") { SecureRandom.base64(24) }

    AdminUser.create!(email:, password:, password_confirmation: password)

    puts "Admin created: #{email}"
    puts "Password: #{password}"
  end

  desc "Reset admin password"
  task :reset_password, [:email] => :environment do |_t, args|
    email = args[:email] || ENV["ADMIN_EMAIL"]
    abort "Usage: bin/rails admin:reset_password[email@example.com]" unless email

    admin = AdminUser.find_by!(email:)
    password = ENV.fetch("ADMIN_PASSWORD") { SecureRandom.base64(24) }
    admin.update!(password:, password_confirmation: password, failed_login_attempts: 0, locked_at: nil)

    puts "Password reset for #{email}"
    puts "New password: #{password}"
    puts "Failed attempts and lockout cleared."
  end

  desc "Unlock a locked admin account"
  task :unlock, [:email] => :environment do |_t, args|
    email = args[:email] || ENV["ADMIN_EMAIL"]
    abort "Usage: bin/rails admin:unlock[email@example.com]" unless email

    admin = AdminUser.find_by!(email:)
    admin.update!(failed_login_attempts: 0, locked_at: nil)

    puts "Account unlocked for #{email}"
  end

  desc "List all admin users"
  task list: :environment do
    AdminUser.find_each do |admin|
      status = admin.locked? ? "🔒 LOCKED" : "✓ Active"
      totp = admin.totp_enabled? ? "🔐 2FA enabled" : "⚠  2FA not set up"
      puts "#{admin.email} — #{status} — #{totp}"
    end
  end

  desc "Disable TOTP for an admin (use only if authenticator is lost)"
  task :disable_totp, [:email] => :environment do |_t, args|
    email = args[:email] || ENV["ADMIN_EMAIL"]
    abort "Usage: bin/rails admin:disable_totp[email@example.com]" unless email

    admin = AdminUser.find_by!(email:)
    admin.admin_totp&.destroy!

    puts "Two-factor authentication disabled for #{email}"
    puts "They will be prompted to set it up again on next login."
  end
end
