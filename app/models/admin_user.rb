class AdminUser < ApplicationRecord
  self.table_name = "admins"

  has_secure_password
  has_one :admin_totp, dependent: :destroy, foreign_key: :admin_id

  validates :email, presence: true, uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP }

  LOCKOUT_PERIOD = 15.minutes
  MAX_ATTEMPTS = 5

  def lockout_expired?
    locked_at.nil? || locked_at < LOCKOUT_PERIOD.ago
  end

  def locked?
    !lockout_expired?
  end

  def increment_failed_attempts!
    with_lock do
      increment!(:failed_login_attempts).tap do
        if failed_login_attempts >= MAX_ATTEMPTS
          update!(locked_at: Time.current)
        end
      end
    end
  end

  def reset_failed_attempts!
    update!(failed_login_attempts: 0, locked_at: nil)
  end

  def totp_enabled?
    admin_totp&.enabled?
  end

  def generate_totp_secret!
    create_admin_totp!(secret: ROTP::Base32.random, enabled: false)
  end

  def totp_secret
    admin_totp&.secret
  end

  def totp_provisioning_uri
    return nil unless totp_secret

    ROTP::TOTP.new(totp_secret, issuer: "Milkcrate").provisioning_uri(email)
  end

  def verify_totp!(code)
    return false unless totp_secret

    begin
      totp = ROTP::TOTP.new(totp_secret, issuer: "Milkcrate")
      matched = totp.verify(code, drift_behind: 30, drift_ahead: 30, after: admin_totp&.last_used_at || 0)
    rescue ROTP::Base32::Base32Error => e
      Rails.logger.error "[AdminUser] Corrupted TOTP secret for #{email}: #{e.message}"
      return false
    end

    if matched
      admin_totp&.update!(last_used_at: Time.current, enabled: true)
      true
    else
      false
    end
  end
end
