class AdminTotp < ApplicationRecord
  belongs_to :admin, class_name: "AdminUser", foreign_key: :admin_id

  def verify!(code)
    return false unless secret.present?

    matched_at = verify_with_replay_check(code)
    return false unless matched_at

    record_use!(matched_at)
    true
  end

  def provisioning_uri(email)
    totp_generator.provisioning_uri(email)
  end

  def generate_secret!
    update!(secret: ROTP::Base32.random, enabled: false)
  end

  def qr_code_data_uri
    uri = provisioning_uri(admin.email)
    qrcode = RQRCode::QRCode.new(uri)
    svg = qrcode.as_svg(
      module_size: 4,
      standalone: true,
      use_path: true,
      color: "#1c1917"
    )
    "data:image/svg+xml;base64,#{Base64.strict_encode64(svg)}"
  end

  private

  def totp_generator
    ROTP::TOTP.new(secret, issuer: "Milkcrate")
  end

  def verify_with_replay_check(code)
    totp_generator.verify(code, drift_behind: 30, drift_ahead: 30, after: last_used_at || 0)
  rescue ROTP::Base32::Base32Error => e
    Rails.logger.error "[AdminTotp] Corrupted TOTP secret for admin##{admin_id}: #{e.message}"
    nil
  end

  def record_use!(matched_at)
    update!(last_used_at: Time.at(matched_at), enabled: true)
  end
end
