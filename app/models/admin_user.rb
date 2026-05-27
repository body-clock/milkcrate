class AdminUser < ApplicationRecord
  self.table_name = "admins"

  has_secure_password
  has_one :admin_totp, dependent: :destroy, foreign_key: :admin_id

  validates :email, presence: true, uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP }

  before_save :downcase_email

  LOCKOUT_PERIOD = 15.minutes
  MAX_ATTEMPTS = 5

  def locked?
    !lockout_expired?
  end

  def lockout_expired?
    return true if locked_at.nil?
    return false unless locked_at < LOCKOUT_PERIOD.ago

    clear_lockout!
    true
  end

  def increment_failed_attempts!
    with_lock do
      increment!(:failed_login_attempts).tap do
        update!(locked_at: Time.current) if failed_login_attempts >= MAX_ATTEMPTS
      end
    end
  end

  def reset_failed_attempts!
    update!(failed_login_attempts: 0, locked_at: nil)
  end

  # TOTP delegation

  def totp_enabled?
    admin_totp&.enabled?
  end

  def totp_secret
    admin_totp&.secret
  end

  def totp_provisioning_uri
    admin_totp&.provisioning_uri(email)
  end

  def totp_qr_code_data_uri
    admin_totp&.qr_code_data_uri
  end

  def verify_totp!(code)
    admin_totp&.verify!(code)
  end

  def generate_totp_secret!
    create_admin_totp!(secret: ROTP::Base32.random, enabled: false)
  end

  private

  def downcase_email
    self.email = email.strip.downcase
  end

  def clear_lockout!
    update!(failed_login_attempts: 0, locked_at: nil)
  end
end
